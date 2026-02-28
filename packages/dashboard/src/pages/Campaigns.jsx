import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { buildCampaignMonitoring, fetchCampaignMonitoringData, SLO_WINDOWS } from '../lib/campaignMonitoring.js';
import { readMessagingActivity } from '../lib/messagingActivity.js';
import './dashboard.css';

export default function Campaigns({ onNavigate, activePath }) {
  const [monitoring, setMonitoring] = useState({
    items: [],
    totals: { campaigns: 0, leads: 0, sent: 0, delivered: 0, replied: 0, failed: 0 },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');
  const [sloWindow, setSloWindow] = useState('24h');

  const loadMonitoring = async () => {
    setLoading(true);
    setError('');
    try {
      const { leads, receipts } = await fetchCampaignMonitoringData();
      setMonitoring(
        buildCampaignMonitoring({
          leads,
          receipts,
          activity: readMessagingActivity(),
          window: sloWindow,
        })
      );
      setUpdatedAt(new Date().toLocaleTimeString('pt-BR'));
    } catch (loadError) {
      setError(loadError?.message || 'Falha ao carregar monitoramento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonitoring();
    const timer = window.setInterval(loadMonitoring, 30000);
    const onActivityUpdated = () => loadMonitoring();
    window.addEventListener('findvan:messaging-activity-updated', onActivityUpdated);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('findvan:messaging-activity-updated', onActivityUpdated);
    };
  }, [sloWindow]);

  return (
    <Layout onNavigate={onNavigate} activePath={activePath}>
      <header className="fv-header">
        <div>
          <h1>Campanhas</h1>
          <p>Execução e monitoramento operacional de campanhas SDR.</p>
        </div>
        <div className="fv-actions">
          <button className="fv-ghost" type="button" onClick={loadMonitoring} disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar monitoramento'}
          </button>
          <button className="fv-primary" type="button">
            Criar campanha
          </button>
        </div>
      </header>

      <section className="fv-grid fv-grid-campaign-monitor">
        <div className="fv-card">
          <div className="fv-card-label">Campanhas ativas</div>
          <div className="fv-card-value">{monitoring.totals.campaigns}</div>
          <div className="fv-card-meta">Atualizado às {updatedAt || '--:--:--'}</div>
        </div>
        <div className="fv-card">
          <div className="fv-card-label">Mensagens enviadas</div>
          <div className="fv-card-value">{monitoring.totals.sent}</div>
          <div className="fv-card-meta">Total consolidado</div>
        </div>
        <div className="fv-card">
          <div className="fv-card-label">Taxa de entrega</div>
          <div className="fv-card-value">
            {monitoring.totals.sent > 0 ? Math.round((monitoring.totals.delivered / monitoring.totals.sent) * 100) : 0}%
          </div>
          <div className="fv-card-meta">{monitoring.totals.delivered} entregues</div>
        </div>
        <div className="fv-card">
          <div className="fv-card-label">Taxa de resposta</div>
          <div className="fv-card-value">
            {monitoring.totals.sent > 0 ? Math.round((monitoring.totals.replied / monitoring.totals.sent) * 100) : 0}%
          </div>
          <div className="fv-card-meta">{monitoring.totals.replied} respostas</div>
        </div>
      </section>

      <section className="fv-panel fv-scraper-section">
        <div className="fv-panel-header">
          <h2>SLO operacional</h2>
          <label className="fv-field fv-field-inline">
            <span>Janela</span>
            <select className="fv-input fv-select" value={sloWindow} onChange={(event) => setSloWindow(event.target.value)}>
              {SLO_WINDOWS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!monitoring.slo?.hasData ? (
          <div className="fv-row-sub">Sem dados suficientes para cálculo de SLO na janela selecionada.</div>
        ) : (
          <>
            <div className="fv-slo-grid">
              <div className="fv-card fv-card-soft">
                <div className="fv-card-label">Taxa de entrega</div>
                <div className="fv-card-value">{monitoring.slo.deliveryRate}%</div>
                <div className="fv-card-meta">{monitoring.slo.delivered} eventos entregues</div>
              </div>
              <div className="fv-card fv-card-soft">
                <div className="fv-card-label">Taxa de resposta</div>
                <div className="fv-card-value">{monitoring.slo.replyRate}%</div>
                <div className="fv-card-meta">{monitoring.slo.replied} respostas</div>
              </div>
              <div className="fv-card fv-card-soft">
                <div className="fv-card-label">Taxa de falha</div>
                <div className="fv-card-value">{monitoring.slo.failureRate}%</div>
                <div className="fv-card-meta">{monitoring.slo.failed} falhas</div>
              </div>
              <div className="fv-card fv-card-soft">
                <div className="fv-card-label">Latência média</div>
                <div className="fv-card-value">{monitoring.slo.latencyAvgMinutes} min</div>
                <div className="fv-card-meta">{monitoring.slo.sent} envios analisados</div>
              </div>
            </div>
            <div className="fv-slo-alerts">
              <div className={`fv-row-chip fv-slo-severity ${monitoring.slo.severity.key}`}>
                Prioridade: {monitoring.slo.severity.label}
              </div>
              {monitoring.slo.alerts.length === 0 && (
                <div className="fv-row-sub">Nenhum alerta crítico para esta janela.</div>
              )}
              {monitoring.slo.alerts.slice(0, 4).map((alert, index) => (
                <div key={`${alert.key}-${index}`} className={`fv-alert-pill fv-alert-${alert.key}`}>
                  {alert.message}
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="fv-panel">
        <div className="fv-panel-header">
          <h2>Painel de monitoramento por campanha</h2>
          <div className="fv-row-sub">Falhas: {monitoring.totals.failed}</div>
        </div>

        {error && <div className="fv-message">{error}</div>}

        <div className="fv-table">
          {monitoring.items.length === 0 && <div className="fv-row-sub">Sem dados de campanhas até o momento.</div>}
          {monitoring.items.map((item) => (
            <div key={item.name} className="fv-row fv-monitoring-row">
              <div>
                <div className="fv-row-title">{item.name}</div>
                <div className="fv-row-sub">
                  Leads: {item.leads} • Enviadas: {item.sent} • Entregues: {item.delivered}
                </div>
                <div className="fv-row-sub">
                  Respostas: {item.replied} • Falhas: {item.failed} • Entrega: {item.deliveryRate}% • Resposta: {item.replyRate}%
                </div>
              </div>
              <div className={`fv-row-chip fv-risk-chip ${item.risk.key}`}>{item.risk.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="fv-panel">
        <div className="fv-panel-header">
          <h2>Reconciliação de status</h2>
          <div className="fv-row-sub">
            Críticas: {monitoring.reconciliation?.totals?.critical || 0} • Transitórias:{' '}
            {monitoring.reconciliation?.totals?.warning || 0}
          </div>
        </div>

        <div className="fv-table">
          {(!monitoring.reconciliation?.items || monitoring.reconciliation.items.length === 0) && (
            <div className="fv-row-sub">Sem divergências de reconciliação no momento.</div>
          )}
          {(monitoring.reconciliation?.items || []).slice(0, 12).map((item) => (
            <div key={`${item.leadId}-${item.localStatus}-${item.providerStatus}`} className="fv-row fv-monitoring-row">
              <div>
                <div className="fv-row-title">{item.leadName}</div>
                <div className="fv-row-sub">Campanha: {item.campaign}</div>
                <div className="fv-row-sub">
                  Local: {item.localStatus} • Provider: {item.providerStatus}
                </div>
              </div>
              <div className={`fv-row-chip fv-reconciliation-chip ${item.severity.key}`}>{item.severity.label}</div>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}
