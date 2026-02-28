import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout.jsx';
import Icon from '../components/Icon.jsx';
import './dashboard.css';
import { API_BASE } from '../lib/apiBase.js';

const funnelMeta = {
  novo: { label: 'Novo', className: 'funnel-novo' },
  contactado: { label: 'Contactado', className: 'funnel-contactado' },
  respondeu: { label: 'Respondeu', className: 'funnel-respondeu' },
  interessado: { label: 'Interessado', className: 'funnel-interessado' },
  convertido: { label: 'Convertido', className: 'funnel-convertido' },
  perdido: { label: 'Perdido', className: 'funnel-perdido' },
};

const statusClass = {
  Novo: 'novo',
  Qualificado: 'qualificado',
  'Em contato': 'em-contato',
  Concluído: 'concluido',
  Falhou: 'agendado',
  completed: 'concluido',
  failed: 'agendado',
};

const formatNumber = (value) => {
  const amount = Number(value || 0);
  return amount.toLocaleString('pt-BR');
};

const formatPercent = (value) => `${Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

const formatStatusFromLead = (lead) => {
  if (lead?.is_duplicate) return 'Em contato';
  return lead?.is_valid ? 'Qualificado' : 'Novo';
};

const formatRelativeDate = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `há ${diffHours} h`;
  return date.toLocaleDateString('pt-BR');
};

const fetchWithFallback = async (primaryUrl, fallbackUrl) => {
  const primary = await fetch(primaryUrl);
  if (primary.status !== 404) return primary;
  if (!fallbackUrl) return primary;
  return fetch(fallbackUrl);
};

const activityTypeMeta = {
  scraper: { icon: 'scraper', className: 'scraper' },
  msg_sent: { icon: 'whatsapp', className: 'msg-sent' },
  msg_received: { icon: 'recent', className: 'msg-received' },
  status_change: { icon: 'activity', className: 'status-change' },
  campaign: { icon: 'campaigns', className: 'campaign' },
};

const toCsv = (rows) => {
  const headers = [
    'id',
    'name',
    'company_name',
    'city',
    'state',
    'phone',
    'email',
    'address',
    'source',
    'is_valid',
    'is_duplicate',
    'captured_at',
  ];
  const escape = (value) => {
    const text = String(value ?? '');
    const escaped = text.replace(/"/g, '""');
    return `"${escaped}"`;
  };
  const lines = rows.map((row) => headers.map((key) => escape(row[key])).join(','));
  return [headers.join(','), ...lines].join('\n');
};

export default function Dashboard({ onNavigate, activePath }) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [leads, setLeads] = useState([]);
  const [dashboardKpis, setDashboardKpis] = useState({
    valid_leads: 0,
    jobs_today: 0,
    leads_24h: 0,
    contacted_leads: 0,
    reply_rate: 0,
    monthly_conversions: 0,
  });
  const [funnelSummary, setFunnelSummary] = useState({
    total: 0,
    conversion_rate: 0,
    stages: [],
  });
  const [urgentActions, setUrgentActions] = useState({
    alerts: [],
    all_clear: true,
  });
  const [weeklyPerformance, setWeeklyPerformance] = useState({
    has_data: false,
    messages_sent: 0,
    delivery_rate: 0,
    reply_rate: 0,
    block_rate: 0,
    labels: [],
    series: [],
  });
  const [activityEvents, setActivityEvents] = useState([]);
  const [scraperRuns, setScraperRuns] = useState([]);

  const loadDashboard = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const [leadsRes, runsRes, kpisRes, funnelRes, urgentRes, weeklyRes, activityRes] = await Promise.all([
        fetch(`${API_BASE}/api/leads/?limit=120`),
        fetchWithFallback(
          `${API_BASE}/api/scraper/runs?limit=10`,
          `${API_BASE}/api/scraper/runs/?limit=10`
        ),
        fetchWithFallback(`${API_BASE}/api/dashboard/kpis`, `${API_BASE}/api/dashboard/kpis/`),
        fetchWithFallback(
          `${API_BASE}/api/dashboard/funnel-summary`,
          `${API_BASE}/api/dashboard/funnel-summary/`
        ),
        fetchWithFallback(
          `${API_BASE}/api/dashboard/urgent-actions`,
          `${API_BASE}/api/dashboard/urgent-actions/`
        ),
        fetchWithFallback(
          `${API_BASE}/api/dashboard/weekly-performance`,
          `${API_BASE}/api/dashboard/weekly-performance/`
        ),
        fetchWithFallback(`${API_BASE}/api/activity?limit=20`, `${API_BASE}/api/activity/?limit=20`),
      ]);

      const [
        leadsPayload,
        runsPayload,
        kpisPayload,
        funnelPayload,
        urgentPayload,
        weeklyPayload,
        activityPayload,
      ] = await Promise.all([
        leadsRes.json(),
        runsRes.json(),
        kpisRes.json(),
        funnelRes.json(),
        urgentRes.json(),
        weeklyRes.json(),
        activityRes.json(),
      ]);

      if (!leadsRes.ok) {
        throw new Error(leadsPayload?.detail || 'Falha ao carregar leads.');
      }
      if (Array.isArray(leadsPayload?.leads)) {
        setLeads(leadsPayload.leads);
      }
      if (runsRes.ok && Array.isArray(runsPayload?.runs)) {
        setScraperRuns(runsPayload.runs);
      }
      if (kpisRes.ok && kpisPayload?.kpis) {
        setDashboardKpis(kpisPayload.kpis);
      }
      if (funnelRes.ok && funnelPayload?.summary) {
        setFunnelSummary(funnelPayload.summary);
      }
      if (urgentRes.ok && urgentPayload?.urgent_actions) {
        setUrgentActions(urgentPayload.urgent_actions);
      }
      if (weeklyRes.ok && weeklyPayload?.performance) {
        setWeeklyPerformance(weeklyPayload.performance);
      }
      if (activityRes.ok && Array.isArray(activityPayload?.events)) {
        setActivityEvents(activityPayload.events);
      }

      setLastRefresh(new Date());
    } catch (error) {
      setErrorMessage(error?.message || 'Falha ao carregar dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const loadRealtimePanels = async () => {
    try {
      const [weeklyRes, activityRes] = await Promise.all([
        fetchWithFallback(
          `${API_BASE}/api/dashboard/weekly-performance`,
          `${API_BASE}/api/dashboard/weekly-performance/`
        ),
        fetchWithFallback(`${API_BASE}/api/activity?limit=20`, `${API_BASE}/api/activity/?limit=20`),
      ]);
      const [weeklyPayload, activityPayload] = await Promise.all([weeklyRes.json(), activityRes.json()]);

      if (weeklyRes.ok && weeklyPayload?.performance) {
        setWeeklyPerformance(weeklyPayload.performance);
      }
      if (activityRes.ok && Array.isArray(activityPayload?.events)) {
        setActivityEvents(activityPayload.events);
      }
      setLastRefresh(new Date());
    } catch (error) {
      // Keep dashboard stable even when background refresh fails.
    }
  };

  useEffect(() => {
    loadDashboard();
    const pollHandle = window.setInterval(loadRealtimePanels, 30000);

    const onRefresh = () => loadDashboard();
    const onStorage = (event) => {
      if (event.key === 'findvan.leads.lastRefresh') {
        loadDashboard();
      }
    };

    window.addEventListener('findvan:leads-updated', onRefresh);
    window.addEventListener('storage', onStorage);
    return () => {
      window.clearInterval(pollHandle);
      window.removeEventListener('findvan:leads-updated', onRefresh);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const recentLeads = useMemo(() => leads.slice(0, 6), [leads]);

  const dashboardStats = useMemo(() => {
    const repliedLeads = leads.filter((lead) => lead.funnel_status === 'respondeu').length;
    const uniqueCityCount = new Set(leads.map((lead) => lead.city).filter(Boolean)).size;
    return [
      {
        label: 'Leads válidos',
        value: formatNumber(dashboardKpis.valid_leads),
        delta: `${uniqueCityCount} cidades ativas`,
        icon: 'leads',
      },
      {
        label: 'Coletas hoje',
        value: formatNumber(dashboardKpis.jobs_today),
        delta: `Última atualização ${lastRefresh ? formatRelativeDate(lastRefresh.toISOString()) : '--'}`,
        icon: 'scraper',
      },
      {
        label: 'Leads capturados (24h)',
        value: formatNumber(dashboardKpis.leads_24h),
        delta: `${formatNumber(repliedLeads)} responderam`,
        icon: 'recent',
      },
      {
        label: 'Leads contactados',
        value: formatNumber(dashboardKpis.contacted_leads),
        delta: 'Status diferente de Novo',
        icon: 'activity',
      },
      {
        label: 'Taxa de resposta',
        value: formatPercent(dashboardKpis.reply_rate),
        delta: 'Respondeu / Contactado',
        icon: 'whatsapp',
      },
      {
        label: 'Conversões do mês',
        value: formatNumber(dashboardKpis.monthly_conversions),
        delta: 'Leads em Convertido',
        icon: 'campaigns',
      },
    ];
  }, [dashboardKpis, leads, lastRefresh]);

  const weeklyBars = useMemo(() => {
    const labels = weeklyPerformance.labels || [];
    const values = weeklyPerformance.series || [];
    const max = Math.max(1, ...values);
    return labels.map((label, index) => {
      const value = Number(values[index] || 0);
      return {
        label,
        value,
        height: Math.max(6, Math.round((value / max) * 100)),
      };
    });
  }, [weeklyPerformance]);

  const activity = useMemo(
    () =>
      activityEvents.map((item) => {
        const meta = activityTypeMeta[item.type] || activityTypeMeta.status_change;
        return {
          ...item,
          icon: meta.icon,
          className: meta.className,
          time: formatRelativeDate(item.created_at),
        };
      }),
    [activityEvents]
  );

  const exportLeads = () => {
    if (!leads.length) {
      setErrorMessage('Não há leads para exportar.');
      return;
    }
    const csv = toCsv(leads);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    link.href = url;
    link.download = `findvan-leads-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const goTo = (path) => {
    const targetPath = path.split('?')[0];
    if (targetPath === activePath && !path.includes('?')) return;
    window.history.pushState({}, '', path);
    onNavigate(window.location.pathname);
  };

  const openLeadsWithFunnel = (funnelStatus) => {
    if (!funnelStatus) {
      goTo('/leads');
      return;
    }
    goTo(`/leads?funnel=${encodeURIComponent(funnelStatus)}`);
  };

  return (
    <Layout onNavigate={onNavigate} activePath={activePath}>
      <header className="fv-header">
        <div>
          <h1 className="fv-icon-label">
            <Icon name="dashboard" size={20} />
            Visão Geral
          </h1>
          <p>Centralize a operação de prospecção e SDR em um só lugar.</p>
        </div>
        <div className="fv-actions">
          <button className="fv-ghost" type="button" onClick={exportLeads}>
            <span className="fv-icon-label">
              <Icon name="export" />
              Exportar leads
            </span>
          </button>
          <button className="fv-primary" type="button" onClick={() => goTo('/campanhas')}>
            <span className="fv-icon-label">
              <Icon name="plus" />
              Criar campanha
            </span>
          </button>
          <button className="fv-ghost" type="button" onClick={loadDashboard}>
            <span className="fv-icon-label">
              <Icon name="refresh" />
              {loading ? 'Atualizando...' : 'Atualizar'}
            </span>
          </button>
        </div>
      </header>

      {errorMessage && <div className="fv-message">{errorMessage}</div>}

      <section className="fv-grid fv-grid-kpis">
        {(loading && !lastRefresh
          ? Array.from({ length: 6 }).map((_, index) => ({
              label: `Carregando-${index}`,
              value: '...',
              delta: 'Aguardando dados',
              icon: 'dashboard',
            }))
          : dashboardStats
        ).map((item) => (
          <div key={item.label} className="fv-card">
            <div className="fv-card-label fv-icon-label">
              <Icon name={item.icon} />
              {item.label}
            </div>
            <div className="fv-card-value">{item.value}</div>
            <div className="fv-card-meta">{item.delta}</div>
          </div>
        ))}
      </section>

      <section className="fv-columns fv-columns-dashboard">
        <div className="fv-panel">
          <div className="fv-panel-header">
            <h2 className="fv-icon-label">
              <Icon name="activity" />
              Mini-funil
            </h2>
            <button className="fv-ghost small" type="button" onClick={() => goTo('/leads')}>
              Ver funil completo
            </button>
          </div>
          <div className="fv-funnel-widget">
            {(funnelSummary.stages || []).map((stage) => {
              const meta = funnelMeta[stage.status] || { label: stage.status, className: '' };
              return (
                <button
                  key={stage.status}
                  className="fv-funnel-stage"
                  type="button"
                  onClick={() => openLeadsWithFunnel(stage.status)}
                >
                  <div className="fv-funnel-stage-head">
                    <span className={`fv-status ${meta.className}`}>{meta.label}</span>
                    <span className="fv-row-sub">
                      {formatNumber(stage.count)} ({formatPercent(stage.percentage)})
                    </span>
                  </div>
                  <div className="fv-funnel-track">
                    <div
                      className={`fv-funnel-fill ${meta.className}`}
                      style={{ width: `${Math.max(3, Number(stage.percentage || 0))}%` }}
                    />
                  </div>
                </button>
              );
            })}
            <div className="fv-row-sub">
              Taxa de conversão geral: <strong>{formatPercent(funnelSummary.conversion_rate)}</strong>
            </div>
          </div>
        </div>

        <div className="fv-panel">
          <div className="fv-panel-header">
            <h2 className="fv-icon-label">
              <Icon name="recent" />
              Ações urgentes
            </h2>
            <button className="fv-primary" type="button" onClick={() => goTo('/leads')}>
              Abrir SDR
            </button>
          </div>
          {urgentActions.all_clear ? (
            <div className="fv-urgent-empty">Tudo em dia!</div>
          ) : (
            <div className="fv-urgent-list">
              {urgentActions.alerts.map((alert) => (
                <button
                  key={alert.id}
                  type="button"
                  className={`fv-urgent-item ${alert.color}`}
                  onClick={() => openLeadsWithFunnel(alert.funnel)}
                >
                  <span>{alert.label}</span>
                  <span className="fv-row-chip">{formatNumber(alert.count)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="fv-columns fv-columns-analytics">
        <div className="fv-panel">
          <div className="fv-panel-header">
            <h2 className="fv-icon-label">
              <Icon name="whatsapp" />
              Performance semanal
            </h2>
            {weeklyPerformance.block_rate > 5 ? (
              <span className="fv-alert-pill">Bloqueio alto</span>
            ) : null}
          </div>
          {weeklyPerformance.has_data ? (
            <>
              <div className="fv-weekly-kpis">
                <div className="fv-weekly-kpi">
                  <span>Mensagens enviadas</span>
                  <strong>{formatNumber(weeklyPerformance.messages_sent)}</strong>
                </div>
                <div className="fv-weekly-kpi">
                  <span>Taxa de entrega</span>
                  <strong>{formatPercent(weeklyPerformance.delivery_rate)}</strong>
                </div>
                <div className="fv-weekly-kpi">
                  <span>Taxa de resposta</span>
                  <strong>{formatPercent(weeklyPerformance.reply_rate)}</strong>
                </div>
                <div className="fv-weekly-kpi">
                  <span>Taxa de bloqueio</span>
                  <strong className={weeklyPerformance.block_rate > 5 ? 'danger' : ''}>
                    {formatPercent(weeklyPerformance.block_rate)}
                  </strong>
                </div>
              </div>
              <div className="fv-weekly-chart">
                {weeklyBars.map((item) => (
                  <div key={item.label} className="fv-weekly-bar-item" title={`${item.label}: ${item.value}`}>
                    <div className="fv-weekly-bar-track">
                      <div className="fv-weekly-bar-fill" style={{ height: `${item.height}%` }} />
                    </div>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="fv-row-sub">Sem dados de envio</div>
          )}
        </div>

        <div className="fv-panel">
          <div className="fv-panel-header">
            <h2 className="fv-icon-label">
              <Icon name="activity" />
              Atividade unificada
            </h2>
            <button className="fv-ghost small" type="button" onClick={() => goTo('/leads')}>
              Ver histórico
            </button>
          </div>
          <div className="fv-activity">
            {activity.map((item) => (
              <div key={item.id} className={`fv-activity-item ${item.className}`}>
                <div className="fv-activity-head">
                  <span className="fv-icon-label">
                    <Icon name={item.icon} size={16} />
                    <span className="fv-activity-title">{item.title}</span>
                  </span>
                  <span className="fv-activity-time">{item.time}</span>
                </div>
                <div className="fv-row-sub">{item.description || 'Sem descrição'}</div>
              </div>
            ))}
            {activity.length === 0 && <div className="fv-row-sub">Sem atividade recente.</div>}
          </div>
        </div>
      </section>

      <section className="fv-columns">
        <div className="fv-panel">
          <div className="fv-panel-header">
            <h2 className="fv-icon-label">
              <Icon name="recent" />
              Leads recentes
            </h2>
            <button className="fv-ghost small" type="button" onClick={() => goTo('/leads')}>
              Ver todos
            </button>
          </div>
          <div className="fv-table">
            {recentLeads.map((lead) => {
              const status = formatStatusFromLead(lead);
              return (
                <div
                  key={`${lead.id}-${lead.phone || lead.name}`}
                  className="fv-row fv-row-button"
                  onClick={() => goTo('/leads')}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') goTo('/leads');
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="fv-row-main">
                    <div className="fv-row-title">{lead.company_name || lead.name}</div>
                    <div className="fv-row-sub">
                      {lead.city || 'Cidade n/d'}
                      {lead.state ? ` • ${lead.state}` : ''} • {lead.phone || 'Sem telefone'}
                    </div>
                  </div>
                  <div className="fv-row-chip">{lead.source || 'google_maps'}</div>
                  <div className={`fv-status ${statusClass[status] || ''}`}>{status}</div>
                </div>
              );
            })}
            {recentLeads.length === 0 && <div className="fv-row-sub">Sem leads recentes.</div>}
          </div>
        </div>

        <div className="fv-panel">
          <div className="fv-panel-header">
            <h2 className="fv-icon-label">
              <Icon name="scraper" />
              Scraper
            </h2>
            <button className="fv-ghost small" type="button" onClick={() => goTo('/scraper')}>
              <span className="fv-icon-label">
                <Icon name="module" />
                Abrir módulo
              </span>
            </button>
          </div>
          <div className="fv-scraper-list">
            {scraperRuns.slice(0, 3).map((run) => {
              const status = run.status === 'completed' ? 'Concluído' : 'Falhou';
              return (
                <div key={`${run.id}-${run.city}`} className="fv-scraper-item">
                  <div>
                    <div className="fv-row-title">
                      {run.city}
                      {run.state ? ` • ${run.state}` : ''}
                    </div>
                    <div className={`fv-row-sub ${statusClass[status] || ''}`}>{status}</div>
                  </div>
                  <div className="fv-row-chip">{run.inserted_count ?? 0} leads</div>
                </div>
              );
            })}
            {scraperRuns.length === 0 && <div className="fv-row-sub">Sem execuções recentes.</div>}
          </div>
        </div>
      </section>
    </Layout>
  );
}
