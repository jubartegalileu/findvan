import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout.jsx';
import ScoreBadge from '../components/ScoreBadge.jsx';
import { API_BASE } from '../lib/apiBase.js';
import './dashboard.css';

const cadenceLabels = {
  overdue: 'Vencida',
  today: 'Hoje',
  planned: 'Planejada',
};

const cadenceOrder = { overdue: 0, today: 1, planned: 2 };

const formatDateTime = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('pt-BR');
};

export default function SDR({ onNavigate, activePath }) {
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState({ total: 0, done_today: 0, pending: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyLeadId, setBusyLeadId] = useState(null);
  const [cadenceFilter, setCadenceFilter] = useState({ overdue: true, today: true, planned: true });
  const [sellerFilter, setSellerFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [scoreMin, setScoreMin] = useState('0');
  const [scoreMax, setScoreMax] = useState('100');
  const [noteDrafts, setNoteDrafts] = useState({});
  const [assignDrafts, setAssignDrafts] = useState({});
  const [openNotes, setOpenNotes] = useState({});
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [batchAssignDraft, setBatchAssignDraft] = useState('');
  const [batchFeedback, setBatchFeedback] = useState('');

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('limit', '1000');
      if (sellerFilter !== 'all') params.set('assigned_to', sellerFilter);
      const response = await fetch(`${API_BASE}/api/sdr/queue?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.detail || 'Falha ao carregar fila SDR.');
      }
      const nextQueue = Array.isArray(payload.queue) ? payload.queue : [];
      setQueue(nextQueue);
      setSelectedLeadIds((prev) => {
        const validIds = new Set(nextQueue.map((item) => item.lead_id));
        return prev.filter((leadId) => validIds.has(leadId));
      });
    } catch (err) {
      setError(err.message || 'Falha de conexão com o backend.');
    } finally {
      setLoading(false);
    }
  }, [sellerFilter]);

  const loadStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (sellerFilter !== 'all') params.set('assigned_to', sellerFilter);
      const response = await fetch(`${API_BASE}/api/sdr/stats${params.toString() ? `?${params.toString()}` : ''}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.detail || 'Falha ao carregar métricas SDR.');
      }
      setStats({
        total: Number(payload.total || 0),
        done_today: Number(payload.done_today || 0),
        pending: Number(payload.pending || 0),
        overdue: Number(payload.overdue || 0),
      });
    } catch (err) {
      setError(err.message || 'Falha ao carregar métricas SDR.');
    }
  }, [sellerFilter]);

  useEffect(() => {
    loadQueue();
    loadStats();
  }, [loadQueue, loadStats]);

  const cities = useMemo(() => {
    const values = Array.from(new Set(queue.map((item) => item.city).filter(Boolean)));
    return values.sort((a, b) => a.localeCompare(b));
  }, [queue]);

  const sellers = useMemo(() => {
    const values = Array.from(new Set(queue.map((item) => item.assigned_to).filter(Boolean)));
    return values.sort((a, b) => a.localeCompare(b));
  }, [queue]);

  const filteredQueue = useMemo(() => {
    const min = Number(scoreMin);
    const max = Number(scoreMax);

    return queue
      .filter((item) => cadenceFilter[item.cadence_bucket])
      .filter((item) => (cityFilter === 'all' ? true : item.city === cityFilter))
      .filter((item) => {
        const score = Number(item.score || 0);
        if (Number.isFinite(min) && score < min) return false;
        if (Number.isFinite(max) && score > max) return false;
        return true;
      })
      .sort((a, b) => {
        const cadenceDelta = (cadenceOrder[a.cadence_bucket] ?? 9) - (cadenceOrder[b.cadence_bucket] ?? 9);
        if (cadenceDelta !== 0) return cadenceDelta;
        return Number(b.score || 0) - Number(a.score || 0);
      });
  }, [queue, cadenceFilter, cityFilter, scoreMin, scoreMax]);

  const patchAction = async (leadId, body) => {
    setBusyLeadId(leadId);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/sdr/${leadId}/action`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.detail || 'Falha ao registrar ação SDR.');
      }
      await Promise.all([loadQueue(), loadStats()]);
    } catch (err) {
      setError(err.message || 'Falha ao registrar ação SDR.');
    } finally {
      setBusyLeadId(null);
    }
  };

  const patchNote = async (leadId) => {
    const note = (noteDrafts[leadId] || '').trim();
    if (!note) return;

    setBusyLeadId(leadId);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/sdr/${leadId}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.detail || 'Falha ao salvar nota SDR.');
      }
      setNoteDrafts((prev) => ({ ...prev, [leadId]: '' }));
      setOpenNotes((prev) => ({ ...prev, [leadId]: false }));
      await Promise.all([loadQueue(), loadStats()]);
    } catch (err) {
      setError(err.message || 'Falha ao salvar nota SDR.');
    } finally {
      setBusyLeadId(null);
    }
  };

  const patchAssign = async (leadId) => {
    const assignedTo = (assignDrafts[leadId] || '').trim();
    if (!assignedTo) return;

    setBusyLeadId(leadId);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/sdr/${leadId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: assignedTo, author: 'sdr-ui' }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.detail || 'Falha ao atribuir vendedor.');
      }
      await Promise.all([loadQueue(), loadStats()]);
    } catch (err) {
      setError(err.message || 'Falha ao atribuir vendedor.');
    } finally {
      setBusyLeadId(null);
    }
  };

  const patchAssignBatch = async () => {
    const assignedTo = batchAssignDraft.trim();
    if (!assignedTo || selectedLeadIds.length === 0) return;

    setBusyLeadId('batch');
    setError('');
    setBatchFeedback('');
    try {
      const response = await fetch(`${API_BASE}/api/sdr/assign/batch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_ids: selectedLeadIds, assigned_to: assignedTo, author: 'sdr-ui' }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.detail || 'Falha ao atribuir leads em lote.');
      }
      const updatedCount = Number(payload?.updated_count || 0);
      setBatchAssignDraft('');
      setSelectedLeadIds([]);
      setBatchFeedback(`${updatedCount} lead(s) atribuído(s) com sucesso.`);
      await Promise.all([loadQueue(), loadStats()]);
    } catch (err) {
      setError(err.message || 'Falha ao atribuir leads em lote.');
    } finally {
      setBusyLeadId(null);
    }
  };

  const toggleLeadSelection = (leadId, checked) => {
    setSelectedLeadIds((prev) => {
      if (checked) {
        if (prev.includes(leadId)) return prev;
        return [...prev, leadId];
      }
      return prev.filter((currentId) => currentId !== leadId);
    });
  };

  const toggleSelectAllFiltered = (checked) => {
    if (checked) {
      setSelectedLeadIds(filteredQueue.map((lead) => lead.lead_id));
      return;
    }
    setSelectedLeadIds([]);
  };

  const isAllFilteredSelected = filteredQueue.length > 0 && filteredQueue.every((lead) => selectedLeadIds.includes(lead.lead_id));

  const goToWhatsApp = (leadId) => {
    window.history.pushState({}, '', `/whatsapp?leadId=${leadId}`);
    onNavigate('/whatsapp');
  };

  const callLead = (phone) => {
    if (!phone) return;
    window.location.href = `tel:${String(phone).replace(/\s+/g, '')}`;
  };

  return (
    <Layout onNavigate={onNavigate} activePath={activePath}>
      <header className="fv-header">
        <div>
          <h1>SDR</h1>
          <p>Mesa de trabalho do vendedor: fila do dia, acoes rapidas e cadencia.</p>
        </div>
        <div className="fv-actions">
          <button className="fv-ghost" type="button" onClick={() => { loadQueue(); loadStats(); }} disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar fila'}
          </button>
        </div>
      </header>

      <section className="fv-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(160px, 1fr))' }}>
        <div className="fv-card fv-card-soft">
          <div className="fv-card-label">Performance do dia</div>
          <div className="fv-card-value">{stats.done_today} / {stats.pending}</div>
          <div className="fv-card-meta">contatos feitos hoje / pendentes</div>
        </div>
        <div className="fv-card fv-card-soft">
          <div className="fv-card-label">Fila ativa</div>
          <div className="fv-card-value">{stats.total}</div>
          <div className="fv-card-meta">leads com acao operacional</div>
        </div>
        <div className="fv-card fv-card-soft">
          <div className="fv-card-label">Vencidos</div>
          <div className="fv-card-value">{stats.overdue}</div>
          <div className="fv-card-meta">exigem acao imediata</div>
        </div>
      </section>

      <section className="fv-panel fv-panel-compact" style={{ marginBottom: 16 }}>
        <div className="fv-panel-header" style={{ marginBottom: 10 }}>
          <h2>Filtros</h2>
        </div>
        <div className="fv-row" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label className="fv-field">
            <span>Cadencia</span>
            <span className="fv-icon-label" style={{ gap: 14 }}>
              <label className="fv-check-label"><input type="checkbox" checked={cadenceFilter.overdue} onChange={(e) => setCadenceFilter((prev) => ({ ...prev, overdue: e.target.checked }))} /> Vencida</label>
              <label className="fv-check-label"><input type="checkbox" checked={cadenceFilter.today} onChange={(e) => setCadenceFilter((prev) => ({ ...prev, today: e.target.checked }))} /> Hoje</label>
              <label className="fv-check-label"><input type="checkbox" checked={cadenceFilter.planned} onChange={(e) => setCadenceFilter((prev) => ({ ...prev, planned: e.target.checked }))} /> Planejada</label>
            </span>
          </label>

          <label className="fv-field fv-field-inline">
            <span>Vendedor</span>
            <select className="fv-input fv-select" value={sellerFilter} onChange={(e) => setSellerFilter(e.target.value)}>
              <option value="all">Todos</option>
              {sellers.map((seller) => (
                <option key={seller} value={seller}>{seller}</option>
              ))}
            </select>
          </label>

          <label className="fv-field fv-field-inline">
            <span>Cidade</span>
            <select className="fv-input fv-select" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
              <option value="all">Todas</option>
              {cities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </label>

          <label className="fv-field fv-field-inline">
            <span>Score min</span>
            <input className="fv-input fv-input-number" type="number" min="0" max="100" value={scoreMin} onChange={(e) => setScoreMin(e.target.value)} />
          </label>

          <label className="fv-field fv-field-inline">
            <span>Score max</span>
            <input className="fv-input fv-input-number" type="number" min="0" max="100" value={scoreMax} onChange={(e) => setScoreMax(e.target.value)} />
          </label>
        </div>
      </section>

      {error && <div className="fv-feedback-banner" style={{ marginBottom: 16 }}>{error}</div>}

      <section className="fv-panel">
        <div className="fv-panel-header">
          <h2>Fila do dia</h2>
          <span className="fv-row-chip">{filteredQueue.length} leads</span>
        </div>
        <div className="fv-row" style={{ justifyContent: 'space-between', marginBottom: 10, gap: 8, flexWrap: 'wrap' }}>
          <label className="fv-check-label" style={{ marginRight: 8 }}>
            <input
              aria-label="Selecionar todos os leads filtrados"
              type="checkbox"
              checked={isAllFilteredSelected}
              onChange={(e) => toggleSelectAllFiltered(e.target.checked)}
            />
            Selecionar todos
          </label>
          <div className="fv-row-actions">
            <span className="fv-row-sub">{selectedLeadIds.length} selecionados</span>
            <input
              className="fv-input"
              style={{ minWidth: 140 }}
              placeholder="Vendedor lote"
              value={batchAssignDraft}
              onChange={(e) => setBatchAssignDraft(e.target.value)}
            />
            <button
              className="fv-primary"
              type="button"
              disabled={busyLeadId === 'batch' || selectedLeadIds.length === 0 || !batchAssignDraft.trim()}
              onClick={patchAssignBatch}
            >
              {busyLeadId === 'batch' ? 'Atribuindo...' : 'Atribuir em lote'}
            </button>
          </div>
        </div>
        {selectedLeadIds.length === 0 && <div className="fv-row-sub" style={{ marginBottom: 10 }}>Selecione ao menos 1 lead para habilitar atribuição em lote.</div>}
        {batchFeedback && <div className="fv-feedback-banner" style={{ marginBottom: 10 }}>{batchFeedback}</div>}

        {loading ? (
          <div className="fv-message">Carregando fila SDR...</div>
        ) : filteredQueue.length === 0 ? (
          <div className="fv-message">Nenhum lead encontrado para os filtros aplicados.</div>
        ) : (
          <div className="fv-table">
            {filteredQueue.map((lead) => (
              <div
                key={lead.lead_id}
                className={`fv-row fv-lead-card ${lead.cadence_bucket === 'overdue' ? 'overdue' : ''} ${lead.cadence_bucket === 'today' ? 'sdr-today' : ''}`}
              >
                <label className="fv-check-label" style={{ marginRight: 10 }}>
                  <input
                    type="checkbox"
                    aria-label={`Selecionar lead ${lead.lead_id}`}
                    checked={selectedLeadIds.includes(lead.lead_id)}
                    onChange={(e) => toggleLeadSelection(lead.lead_id, e.target.checked)}
                  />
                </label>
                <div className="fv-row-main">
                  <div className="fv-row-title">{lead.name || 'Lead sem nome'}</div>
                  <div className="fv-row-sub">{lead.company_name || '--'} • {lead.city || '--'} • {lead.phone || '--'}</div>
                  <div className="fv-row-sub">Vendedor: {lead.assigned_to || 'default'}</div>
                  <div className="fv-row-sub">Ultimo contato: {formatDateTime(lead.last_contact_at)}</div>
                  <div className="fv-row-sub">Proxima acao: {lead.next_action_description || '--'} ({lead.next_action_date ? formatDateTime(lead.next_action_date) : 'sem data'})</div>
                  <div className="fv-row-actions">
                    <span className="fv-status">{cadenceLabels[lead.cadence_bucket] || 'Planejada'}</span>
                    <ScoreBadge score={lead.score} />
                  </div>

                  <div className="fv-row-actions">
                    <input
                      className="fv-input"
                      style={{ minWidth: 140 }}
                      placeholder="Atribuir vendedor"
                      value={assignDrafts[lead.lead_id] ?? lead.assigned_to ?? ''}
                      onChange={(e) => setAssignDrafts((prev) => ({ ...prev, [lead.lead_id]: e.target.value }))}
                    />
                    <button
                      className="fv-ghost small"
                      type="button"
                      disabled={busyLeadId === lead.lead_id}
                      onClick={() => patchAssign(lead.lead_id)}
                    >
                      Atribuir
                    </button>
                  </div>

                  <div className="fv-row-actions">
                    <button className="fv-ghost small" type="button" onClick={() => goToWhatsApp(lead.lead_id)}>
                      WhatsApp
                    </button>
                    <button className="fv-ghost small" type="button" onClick={() => callLead(lead.phone)}>
                      Telefone
                    </button>
                    <button
                      className="fv-ghost small"
                      type="button"
                      onClick={() => setOpenNotes((prev) => ({ ...prev, [lead.lead_id]: !prev[lead.lead_id] }))}
                    >
                      Anotar
                    </button>
                    <button
                      className="fv-primary"
                      type="button"
                      disabled={busyLeadId === lead.lead_id}
                      onClick={() => patchAction(lead.lead_id, { action_type: 'done' })}
                    >
                      {busyLeadId === lead.lead_id ? 'Salvando...' : 'Marcar feito'}
                    </button>
                  </div>

                  {openNotes[lead.lead_id] && (
                    <div className="fv-notes-tab" style={{ marginTop: 10 }}>
                      <textarea
                        className="fv-input fv-textarea"
                        placeholder="Adicionar nota operacional"
                        value={noteDrafts[lead.lead_id] || ''}
                        onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [lead.lead_id]: e.target.value }))}
                      />
                      <div className="fv-row-actions">
                        <button
                          className="fv-primary"
                          type="button"
                          disabled={busyLeadId === lead.lead_id}
                          onClick={() => patchNote(lead.lead_id)}
                        >
                          Salvar nota
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}
