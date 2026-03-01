import React, { useEffect, useMemo, useState } from 'react';
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
  const [cityFilter, setCityFilter] = useState('all');
  const [scoreMin, setScoreMin] = useState('0');
  const [scoreMax, setScoreMax] = useState('100');
  const [noteDrafts, setNoteDrafts] = useState({});
  const [openNotes, setOpenNotes] = useState({});

  const loadQueue = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/sdr/queue`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.detail || 'Falha ao carregar fila SDR.');
      }
      setQueue(Array.isArray(payload.queue) ? payload.queue : []);
    } catch (err) {
      setError(err.message || 'Falha de conexão com o backend.');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/sdr/stats`);
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
  };

  useEffect(() => {
    loadQueue();
    loadStats();
  }, []);

  const cities = useMemo(() => {
    const values = Array.from(new Set(queue.map((item) => item.city).filter(Boolean)));
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
                <div className="fv-row-main">
                  <div className="fv-row-title">{lead.name || 'Lead sem nome'}</div>
                  <div className="fv-row-sub">{lead.company_name || '--'} • {lead.city || '--'} • {lead.phone || '--'}</div>
                  <div className="fv-row-sub">Ultimo contato: {formatDateTime(lead.last_contact_at)}</div>
                  <div className="fv-row-sub">Proxima acao: {lead.next_action_description || '--'} ({lead.next_action_date ? formatDateTime(lead.next_action_date) : 'sem data'})</div>
                  <div className="fv-row-actions">
                    <span className="fv-status">{cadenceLabels[lead.cadence_bucket] || 'Planejada'}</span>
                    <ScoreBadge score={lead.score} />
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
