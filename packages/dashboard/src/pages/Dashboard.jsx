import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout.jsx';
import Icon from '../components/Icon.jsx';
import './dashboard.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
  const [scraperStats, setScraperStats] = useState({
    jobs_today: 0,
    completed_today: 0,
    leads_24h: 0,
    validation_rate: null,
  });
  const [scraperRuns, setScraperRuns] = useState([]);

  const loadDashboard = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const fetchWithFallback = async (primaryUrl, fallbackUrl) => {
        const primary = await fetch(primaryUrl);
        if (primary.status !== 404) return primary;
        if (!fallbackUrl) return primary;
        return fetch(fallbackUrl);
      };

      const [leadsRes, statsRes, runsRes] = await Promise.all([
        fetch(`${API_BASE}/api/leads/?limit=120`),
        fetchWithFallback(`${API_BASE}/api/scraper/stats`, `${API_BASE}/api/scraper/stats/`),
        fetchWithFallback(
          `${API_BASE}/api/scraper/runs?limit=10`,
          `${API_BASE}/api/scraper/runs/?limit=10`
        ),
      ]);

      const [leadsPayload, statsPayload, runsPayload] = await Promise.all([
        leadsRes.json(),
        statsRes.json(),
        runsRes.json(),
      ]);

      if (!leadsRes.ok) {
        throw new Error(leadsPayload?.detail || 'Falha ao carregar leads.');
      }
      if (Array.isArray(leadsPayload?.leads)) {
        setLeads(leadsPayload.leads);
      }
      if (statsRes.ok && statsPayload?.stats) {
        setScraperStats(statsPayload.stats);
      }
      if (runsRes.ok && Array.isArray(runsPayload?.runs)) {
        setScraperRuns(runsPayload.runs);
      }

      setLastRefresh(new Date());
    } catch (error) {
      setErrorMessage(error?.message || 'Falha ao carregar dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();

    const onRefresh = () => loadDashboard();
    const onStorage = (event) => {
      if (event.key === 'findvan.leads.lastRefresh') {
        loadDashboard();
      }
    };

    window.addEventListener('findvan:leads-updated', onRefresh);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('findvan:leads-updated', onRefresh);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const recentLeads = useMemo(() => leads.slice(0, 6), [leads]);

  const dashboardStats = useMemo(() => {
    const validCount = leads.filter((lead) => !!lead.is_valid).length;
    const uniqueCityCount = new Set(leads.map((lead) => lead.city).filter(Boolean)).size;
    const activeRuns = scraperRuns.filter((run) => run.status !== 'failed').length;

    return [
      {
        label: 'Leads válidos',
        value: formatNumber(validCount),
        delta: `${uniqueCityCount} cidades ativas`,
        icon: 'leads',
      },
      {
        label: 'Coletas hoje',
        value: formatNumber(scraperStats.jobs_today || 0),
        delta: `${formatNumber(scraperStats.completed_today || 0)} concluídas`,
        icon: 'scraper',
      },
      {
        label: 'Leads capturados (24h)',
        value: formatNumber(scraperStats.leads_24h || 0),
        delta:
          scraperStats.validation_rate !== null
            ? `${scraperStats.validation_rate}% taxa de validação`
            : `${activeRuns} execuções recentes`,
        icon: 'recent',
      },
    ];
  }, [leads, scraperRuns, scraperStats]);

  const activity = useMemo(() => {
    const runItems = scraperRuns.slice(0, 3).map((run) => ({
      title: `Scraper ${run.city}${run.state ? `/${run.state}` : ''}`,
      description: `${run.inserted_count ?? 0}/${run.target_count ?? 0} leads inseridos (${run.status}).`,
      time: formatRelativeDate(run.created_at),
    }));

    const leadItems = leads.slice(0, 2).map((lead) => ({
      title: `Lead ${lead.company_name || lead.name}`,
      description: `${lead.city || 'Cidade n/d'}${lead.state ? `/${lead.state}` : ''} • ${formatStatusFromLead(lead)}`,
      time: formatRelativeDate(lead.updated_at || lead.created_at),
    }));

    return [...runItems, ...leadItems].slice(0, 5);
  }, [scraperRuns, leads]);

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
    if (path === activePath) return;
    window.history.pushState({}, '', path);
    onNavigate(path);
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

      <section className="fv-grid">
        {dashboardStats.map((item) => (
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

          <div className="fv-divider" />

          <div className="fv-panel-header">
            <h2 className="fv-icon-label">
              <Icon name="activity" />
              Atividade
            </h2>
            <span className="fv-row-sub">
              Atualizado {lastRefresh ? formatRelativeDate(lastRefresh.toISOString()) : '--'}
            </span>
          </div>
          <div className="fv-activity">
            {activity.map((item, index) => (
              <div key={`${item.title}-${index}`} className="fv-activity-item">
                <div className="fv-activity-title">{item.title}</div>
                <div className="fv-row-sub">{item.description}</div>
                <div className="fv-activity-time">{item.time}</div>
              </div>
            ))}
            {activity.length === 0 && <div className="fv-row-sub">Sem atividade recente.</div>}
          </div>
        </div>
      </section>
    </Layout>
  );
}
