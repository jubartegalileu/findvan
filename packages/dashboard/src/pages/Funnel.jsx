import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DndContext, closestCorners, useDraggable, useDroppable } from '@dnd-kit/core';
import Layout from '../components/Layout.jsx';
import ScoreBadge from '../components/ScoreBadge.jsx';
import { API_BASE } from '../lib/apiBase.js';
import './dashboard.css';

const STAGES = ['novo', 'contactado', 'respondeu', 'interessado', 'convertido', 'perdido'];
const STAGE_LABELS = {
  novo: 'Novo',
  contactado: 'Contactado',
  respondeu: 'Respondeu',
  interessado: 'Interessado',
  convertido: 'Convertido',
  perdido: 'Perdido',
};

const funnelTransitions = {
  novo: ['contactado', 'perdido'],
  contactado: ['respondeu', 'perdido'],
  respondeu: ['interessado', 'perdido'],
  interessado: ['convertido', 'perdido'],
  convertido: ['perdido'],
  perdido: ['novo'],
};

const lossReasonOptions = [
  'sem_interesse',
  'ja_tem_fornecedor',
  'preco_alto',
  'sem_resposta_3_tentativas',
  'numero_invalido_ou_bloqueado',
  'outro',
];

const formatPct = (value) => `${Number(value || 0).toFixed(1)}%`;

function FunnelCard({ lead, status, movingLeadId }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `lead-${lead.lead_id}`,
    data: { lead, fromStatus: status },
  });

  return (
    <div
      ref={setNodeRef}
      className={`fv-funnel-card ${movingLeadId === lead.lead_id ? 'is-moving' : ''}`}
      style={{ opacity: isDragging ? 0.65 : 1 }}
      {...attributes}
      {...listeners}
    >
      <div className="fv-funnel-card-title">{lead.name || 'Lead sem nome'}</div>
      <div className="fv-funnel-card-company">{lead.company_name || '--'}</div>
      <div className="fv-funnel-card-meta">{lead.days_in_stage || 0} dias no estagio</div>
      {status === 'perdido' && lead.loss_reason ? (
        <div className="fv-funnel-card-meta">Motivo: {lead.loss_reason}</div>
      ) : null}
      <div className="fv-row-actions fv-funnel-card-actions">
        <ScoreBadge score={lead.score} />
      </div>
    </div>
  );
}

function FunnelColumn({ status, items, stageMeta, movingLeadId }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `stage-${status}`,
    data: { toStatus: status },
  });

  return (
    <article ref={setNodeRef} className={`fv-funnel-column ${isOver ? 'is-over' : ''}`}>
      <header className="fv-funnel-column-header">
        <h3>{STAGE_LABELS[status]}</h3>
        <span className="fv-row-chip">{items.length}</span>
      </header>
      <div className="fv-row-sub">{formatPct(stageMeta.pct)} do total • conv: {formatPct(stageMeta.conversion_rate)}</div>

      <div className="fv-funnel-column-list">
        {items.map((lead) => (
          <FunnelCard key={lead.lead_id} lead={lead} status={status} movingLeadId={movingLeadId} />
        ))}
      </div>
    </article>
  );
}

export default function Funnel({ onNavigate, activePath }) {
  const [pipeline, setPipeline] = useState({ stages: {}, total: 0 });
  const [summary, setSummary] = useState({ total: 0, overall_conversion: 0, avg_total_days: 0, stages: [] });
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [movingLeadId, setMovingLeadId] = useState(null);
  const [lossModal, setLossModal] = useState({ open: false, leadId: null, fromStatus: null, toStatus: null });
  const [lossReason, setLossReason] = useState('sem_interesse');
  const [lossReasonDetail, setLossReasonDetail] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (period !== 'all') params.set('period', period);
      params.set('limit', '2000');
      const query = `?${params.toString()}`;
      const [pipelineRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE}/api/pipeline/${query}`),
        fetch(`${API_BASE}/api/pipeline/summary${query}`),
      ]);
      const pipelinePayload = await pipelineRes.json();
      const summaryPayload = await summaryRes.json();
      if (!pipelineRes.ok) throw new Error(pipelinePayload?.detail || 'Falha ao carregar pipeline.');
      if (!summaryRes.ok) throw new Error(summaryPayload?.detail || 'Falha ao carregar resumo do pipeline.');

      setPipeline({ stages: pipelinePayload.stages || {}, total: Number(pipelinePayload.total || 0) });
      setSummary({
        total: Number(summaryPayload.total || 0),
        overall_conversion: Number(summaryPayload.overall_conversion || 0),
        avg_total_days: Number(summaryPayload.avg_total_days || 0),
        stages: Array.isArray(summaryPayload.stages) ? summaryPayload.stages : [],
      });
    } catch (err) {
      setError(err.message || 'Falha ao carregar funil.');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stageSummaryMap = useMemo(() => {
    const map = {};
    for (const stage of summary.stages || []) map[stage.status] = stage;
    return map;
  }, [summary.stages]);

  const moveLead = async (leadId, fromStatus, toStatus, forcedLossReason = null, forcedLossReasonDetail = null) => {
    if (fromStatus === toStatus) return;
    if (!funnelTransitions[fromStatus]?.includes(toStatus)) {
      setError(`Transicao invalida: ${STAGE_LABELS[fromStatus]} -> ${STAGE_LABELS[toStatus]}`);
      return;
    }

    if (toStatus === 'perdido' && !forcedLossReason) {
      setLossModal({ open: true, leadId, fromStatus, toStatus });
      setLossReason('sem_interesse');
      setLossReasonDetail('');
      return;
    }

    setMovingLeadId(leadId);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/pipeline/${leadId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_status: toStatus,
          loss_reason: forcedLossReason,
          loss_reason_detail: forcedLossReasonDetail,
          moved_by: 'funnel-ui',
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.detail || 'Falha ao mover lead no funil.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Falha ao mover lead no funil.');
    } finally {
      setMovingLeadId(null);
    }
  };

  const onDragEnd = async (event) => {
    const { active, over } = event;
    if (!active || !over) return;

    const activeData = active.data.current;
    const overData = over.data.current;
    const leadId = activeData?.lead?.lead_id;
    const fromStatus = activeData?.fromStatus;
    const toStatus = overData?.toStatus;

    if (!leadId || !fromStatus || !toStatus) return;
    await moveLead(leadId, fromStatus, toStatus);
  };

  const confirmLossMove = async () => {
    if (!lossModal.open || !lossModal.leadId) return;
    if (!lossReason) return;
    if (lossReason === 'outro' && !lossReasonDetail.trim()) {
      setError('Detalhe obrigatorio para motivo outro.');
      return;
    }

    const payloadDetail = lossReason === 'outro' ? lossReasonDetail.trim() : null;
    const modal = { ...lossModal };
    setLossModal({ open: false, leadId: null, fromStatus: null, toStatus: null });
    await moveLead(modal.leadId, modal.fromStatus, modal.toStatus, lossReason, payloadDetail);
  };

  return (
    <Layout onNavigate={onNavigate} activePath={activePath}>
      <header className="fv-header">
        <div>
          <h1>Funil de Vendas</h1>
          <p>Pipeline visual com controle de estagios e metricas por coluna.</p>
        </div>
        <div className="fv-actions">
          <button className="fv-ghost" type="button" onClick={loadData} disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar funil'}
          </button>
        </div>
      </header>

      <section className="fv-grid fv-funnel-kpi-grid">
        <div className="fv-card fv-card-soft">
          <div className="fv-card-label">Total no pipeline</div>
          <div className="fv-card-value">{summary.total}</div>
          <div className="fv-card-meta">leads ativos no funil</div>
        </div>
        <div className="fv-card fv-card-soft">
          <div className="fv-card-label">Conversao geral</div>
          <div className="fv-card-value">{formatPct(summary.overall_conversion)}</div>
          <div className="fv-card-meta">novo para convertido</div>
        </div>
        <div className="fv-card fv-card-soft">
          <div className="fv-card-label">Tempo medio total</div>
          <div className="fv-card-value">{summary.avg_total_days.toFixed(1)}d</div>
          <div className="fv-card-meta">dias em todo o ciclo</div>
        </div>
      </section>

      <section className="fv-panel fv-panel-compact fv-funnel-period-panel">
        <div className="fv-panel-header fv-funnel-period-header">
          <h2>Periodo</h2>
        </div>
        <div className="fv-row-actions">
          {[{ value: '7', label: '7d' }, { value: '30', label: '30d' }, { value: '90', label: '90d' }, { value: 'all', label: 'Tudo' }].map((option) => (
            <button key={option.value} type="button" className={period === option.value ? 'fv-primary' : 'fv-ghost'} onClick={() => setPeriod(option.value)}>
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {error && <div className="fv-feedback-banner fv-funnel-feedback">{error}</div>}

      <DndContext collisionDetection={closestCorners} onDragEnd={onDragEnd}>
        <section className="fv-funnel-board" role="region" aria-label="Kanban Funil">
          {STAGES.map((status) => {
            const items = pipeline.stages?.[status] || [];
            const stageMeta = stageSummaryMap[status] || { count: items.length, pct: 0, conversion_rate: 0 };
            return <FunnelColumn key={status} status={status} items={items} stageMeta={stageMeta} movingLeadId={movingLeadId} />;
          })}
        </section>
      </DndContext>

      {lossModal.open ? (
        <section className="fv-modal-overlay" role="dialog" aria-modal="true" aria-label="Motivo de perda">
          <div className="fv-modal-card fv-funnel-modal-card">
            <h3>Motivo de perda</h3>
            <p className="fv-row-sub">Informe o motivo para mover o lead para Perdido.</p>
            <div className="fv-notes-tab">
              <label className="fv-field">
                <span>Motivo</span>
                <select className="fv-input fv-select" value={lossReason} onChange={(e) => setLossReason(e.target.value)}>
                  {lossReasonOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              {lossReason === 'outro' ? (
                <label className="fv-field">
                  <span>Detalhe</span>
                  <input className="fv-input" value={lossReasonDetail} onChange={(e) => setLossReasonDetail(e.target.value)} placeholder="Descreva o motivo" />
                </label>
              ) : null}
            </div>
            <div className="fv-row-actions fv-funnel-modal-actions">
              <button type="button" className="fv-ghost" onClick={() => setLossModal({ open: false, leadId: null, fromStatus: null, toStatus: null })}>Cancelar</button>
              <button type="button" className="fv-primary" onClick={confirmLossMove}>Confirmar</button>
            </div>
          </div>
        </section>
      ) : null}
    </Layout>
  );
}
