import React, { useEffect, useMemo, useRef, useState } from 'react';
import Layout from '../components/Layout.jsx';
import './dashboard.css';
import { API_BASE } from '../lib/apiBase.js';

const PAGE_SIZE = 120;

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
    'score',
    'captured_at',
  ];
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map((row) => headers.map((key) => escape(row[key])).join(','));
  return [headers.join(','), ...lines].join('\n');
};

const mapLead = (lead) => ({
  id: lead.id,
  source: lead.source || 'manual',
  name: lead.name || lead.company_name || '',
  company_name: lead.company_name || lead.name || '',
  city: lead.city || '',
  state: lead.state || '',
  phone: lead.phone || '',
  email: lead.email || '',
  address: lead.address || '',
  cnpj: lead.cnpj || '',
  url: lead.url || '',
  tags: Array.isArray(lead.tags) ? lead.tags : [],
  captured_at: lead.captured_at || null,
  created_at: lead.created_at || null,
  updated_at: lead.updated_at || null,
  is_valid: !!lead.is_valid,
  is_duplicate: !!lead.is_duplicate,
  score: Number.isFinite(Number(lead.score)) ? Number(lead.score) : 0,
  campaign_status: lead.campaign_status || '',
  prospect_notes: lead.prospect_notes || '',
});

const initialForm = {
  name: '',
  company_name: '',
  city: '',
  state: '',
  phone: '',
  email: '',
  address: '',
  cnpj: '',
  url: '',
  source: 'manual',
  is_valid: true,
  is_duplicate: false,
  campaign_status: '',
  prospect_notes: '',
};

const formatDateTime = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('pt-BR');
};

const formatScoreClass = (score) => {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'regular';
  return 'weak';
};

export default function Leads({ onNavigate, activePath }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [page, setPage] = useState(0);
  const [leads, setLeads] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(null);

  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [search, setSearch] = useState('');

  const [activeLead, setActiveLead] = useState(null);
  const [formLead, setFormLead] = useState(initialForm);
  const [modalMessage, setModalMessage] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [didHandleLeadQuery, setDidHandleLeadQuery] = useState(false);
  const [importing, setImporting] = useState(false);
  const importFileRef = useRef(null);

  const loadLeads = async (targetPage = page) => {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const offset = Math.max(0, targetPage) * PAGE_SIZE;
      const response = await fetch(`${API_BASE}/api/leads/?limit=${PAGE_SIZE}&offset=${offset}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.detail || 'Falha ao carregar leads.');
      }
      setLeads(Array.isArray(payload?.leads) ? payload.leads.map(mapLead) : []);
      setPage(targetPage);
      setLastRefresh(new Date());
    } catch (error) {
      setErrorMessage(error?.message || 'Falha ao carregar leads.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads(0);
  }, []);

  const states = useMemo(
    () => [...new Set(leads.map((lead) => lead.state).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [leads]
  );

  const cities = useMemo(() => {
    const base = selectedState ? leads.filter((lead) => lead.state === selectedState) : leads;
    return [...new Set(base.map((lead) => lead.city).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [leads, selectedState]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (selectedState && lead.state !== selectedState) return false;
      if (selectedCity && lead.city !== selectedCity) return false;
      if (search.trim()) {
        const term = search.trim().toLowerCase();
        const haystack = [
          lead.name,
          lead.company_name,
          lead.phone,
          lead.email,
          lead.address,
          lead.city,
          lead.state,
          lead.source,
          ...(lead.tags || []),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [leads, search, selectedState, selectedCity]);

  const insights = useMemo(() => {
    const total = filteredLeads.length;
    const valid = filteredLeads.filter((lead) => lead.is_valid).length;
    const duplicate = filteredLeads.filter((lead) => lead.is_duplicate).length;
    return { total, valid, duplicate };
  }, [filteredLeads]);

  const openLeadModal = (lead) => {
    setActiveLead(lead);
    setFormLead({
      name: lead.name || '',
      company_name: lead.company_name || '',
      city: lead.city || '',
      state: lead.state || '',
      phone: lead.phone || '',
      email: lead.email || '',
      address: lead.address || '',
      cnpj: lead.cnpj || '',
      url: lead.url || '',
      source: lead.source || 'manual',
      is_valid: !!lead.is_valid,
      is_duplicate: !!lead.is_duplicate,
      score: lead.score || 0,
      captured_at: lead.captured_at,
      updated_at: lead.updated_at,
      campaign_status: lead.campaign_status || '',
      prospect_notes: lead.prospect_notes || '',
    });
    setModalMessage('');
  };

  useEffect(() => {
    if (didHandleLeadQuery || !leads.length) return;
    const params = new URLSearchParams(window.location.search);
    const leadId = Number(params.get('leadId'));
    if (Number.isInteger(leadId) && leadId > 0) {
      const fromList = leads.find((lead) => Number(lead.id) === leadId);
      if (fromList) {
        openLeadModal(fromList);
      }
    }
    setDidHandleLeadQuery(true);
  }, [leads, didHandleLeadQuery]);

  const closeLeadModal = () => {
    setActiveLead(null);
    setFormLead(initialForm);
    setModalMessage('');
  };

  const saveLead = async () => {
    if (!activeLead?.id) return;
    setSaving(true);
    setModalMessage('');
    try {
      const payload = {
        name: (formLead.name || '').trim(),
        company_name: (formLead.company_name || '').trim() || null,
        city: (formLead.city || '').trim(),
        state: (formLead.state || '').trim() || null,
        phone: (formLead.phone || '').trim() || null,
        email: (formLead.email || '').trim() || null,
        address: (formLead.address || '').trim() || null,
        cnpj: (formLead.cnpj || '').trim() || null,
        url: (formLead.url || '').trim() || null,
        source: (formLead.source || '').trim() || 'manual',
        campaign_status: (formLead.campaign_status || '').trim() || null,
        prospect_notes: (formLead.prospect_notes || '').trim() || null,
        is_valid: !!formLead.is_valid,
        is_duplicate: !!formLead.is_duplicate,
      };

      if (payload.name.length < 2) {
        throw new Error('Nome deve ter ao menos 2 caracteres.');
      }
      if (payload.city.length < 2) {
        throw new Error('Cidade deve ter ao menos 2 caracteres.');
      }

      const response = await fetch(`${API_BASE}/api/leads/${activeLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.detail || 'Falha ao salvar lead.');
      }

      const updated = mapLead(result?.lead || {});
      setLeads((prev) => prev.map((lead) => (lead.id === updated.id ? updated : lead)));
      setActiveLead(updated);
      setFormLead((prev) => ({ ...prev, ...updated }));
      setModalMessage('Lead atualizado com sucesso.');
      setSuccessMessage('Lead atualizado com sucesso.');
    } catch (error) {
      setModalMessage(error?.message || 'Falha ao salvar lead.');
    } finally {
      setSaving(false);
    }
  };

  const exportLeads = () => {
    if (!filteredLeads.length) {
      setErrorMessage('Nao ha leads para exportar.');
      return;
    }
    const csv = toCsv(filteredLeads);
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

  const exportActiveLead = () => {
    if (!activeLead?.id) return;
    const leadToExport = {
      ...activeLead,
      ...formLead,
      id: activeLead.id,
      score: activeLead.score,
      captured_at: activeLead.captured_at,
    };
    const csv = toCsv([leadToExport]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    link.href = url;
    link.download = `findvan-lead-${activeLead.id}-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const deleteLeadFromModal = async () => {
    if (!activeLead?.id || deleting) return;
    const confirmed = window.confirm(`Tem certeza que deseja excluir o lead #${activeLead.id}?`);
    if (!confirmed) return;
    setDeleting(true);
    setModalMessage('');
    try {
      const response = await fetch(`${API_BASE}/api/leads/${activeLead.id}`, {
        method: 'DELETE',
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.detail || 'Falha ao excluir lead.');
      }
      setLeads((prev) => prev.filter((lead) => lead.id !== activeLead.id));
      closeLeadModal();
      setSuccessMessage('Lead excluido com sucesso.');
    } catch (error) {
      setModalMessage(error?.message || 'Falha ao excluir lead.');
    } finally {
      setDeleting(false);
    }
  };

  const refreshAll = async () => {
    setSelectedState('');
    setSelectedCity('');
    setSearch('');
    setDidHandleLeadQuery(false);
    await loadLeads(0);
  };

  const triggerImport = () => {
    importFileRef.current?.click();
  };

  const importLeads = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImporting(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch(`${API_BASE}/api/leads/import`, {
        method: 'POST',
        body,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.detail || 'Falha ao importar leads.');
      }
      await refreshAll();
      setSuccessMessage(
        `Importacao concluida: ${payload.inserted} inseridos, ${payload.duplicates} duplicados no banco, ${payload.deduplicated_in_file} duplicados no arquivo.`
      );
    } catch (error) {
      setErrorMessage(error?.message || 'Falha ao importar leads.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Layout onNavigate={onNavigate} activePath={activePath}>
      <header className="fv-header">
        <div>
          <h1>Leads</h1>
          <p>Gerencie todo o pipeline de prospeccao em tempo real.</p>
        </div>
        <div className="fv-actions">
          <button className="fv-ghost" type="button" onClick={refreshAll} disabled={loading || importing}>
            {loading ? 'Atualizando...' : 'Atualizar leads'}
          </button>
          <button className="fv-ghost" type="button" onClick={triggerImport} disabled={loading || importing}>
            {importing ? 'Importando...' : 'Importar'}
          </button>
          <button className="fv-primary" type="button" onClick={exportLeads}>
            Exportar
          </button>
          <input
            ref={importFileRef}
            type="file"
            accept=".csv,.json,application/json,text/csv"
            onChange={importLeads}
            aria-label="Arquivo de leads"
            style={{ display: 'none' }}
          />
        </div>
      </header>

      {errorMessage && <div className="fv-message">{errorMessage}</div>}
      {successMessage && <div className="fv-message">{successMessage}</div>}

      <section className="fv-leads-toolbar fv-card fv-card-soft">
        <div className="fv-field">
          <label htmlFor="filter-state">Estado</label>
          <select id="filter-state" value={selectedState} onChange={(event) => {
            setSelectedState(event.target.value);
            setSelectedCity('');
          }}>
            <option value="">Todos os estados</option>
            {states.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>
        <div className="fv-field">
          <label htmlFor="filter-city">Cidade</label>
          <select id="filter-city" value={selectedCity} onChange={(event) => setSelectedCity(event.target.value)}>
            <option value="">Todas as cidades</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>
        <div className="fv-field fv-field-search">
          <label htmlFor="filter-search">Busca</label>
          <input
            id="filter-search"
            placeholder="Buscar por nome, empresa, telefone, email..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="fv-row-sub fv-leads-toolbar-meta">
          {insights.total} leads • Atualizado as {lastRefresh ? lastRefresh.toLocaleTimeString('pt-BR') : '--:--:--'}
        </div>
      </section>

      <section className="fv-columns fv-columns-leads">
        <div className="fv-panel">
          <div className="fv-panel-header">
            <h2>Pipeline</h2>
            <span className="fv-row-sub">Pagina {page + 1}</span>
          </div>
          <div className="fv-table">
            {filteredLeads.map((lead) => (
              <article key={lead.id} className="fv-row fv-row-selectable fv-lead-card">
                <button className="fv-row-button fv-row-button-inline" type="button" onClick={() => openLeadModal(lead)}>
                  <div className="fv-row-main">
                    <div className="fv-row-title">{lead.name || lead.company_name || `Lead ${lead.id}`}</div>
                    <div className="fv-row-sub">{lead.company_name || '--'}</div>
                    <div className="fv-row-sub">
                      {lead.city || '--'} {lead.state || ''} • {lead.phone || '--'}
                      {lead.email ? ` • ${lead.email}` : ''}
                    </div>
                    <div className="fv-row-sub">
                      {lead.address || '--'} • Fonte {lead.source || '--'}
                    </div>
                  </div>
                </button>
                <span className={`fv-dot ${lead.is_valid ? 'cliente' : 'nao_contatado'}`} />
                <span className={`fv-row-chip ${formatScoreClass(lead.score)}`}>Score {lead.score}</span>
                <span className={`fv-status ${lead.is_valid ? 'funnel-convertido' : 'funnel-novo'}`}>
                  {lead.is_valid ? 'Qualificado' : 'Nao contatado'}
                </span>
              </article>
            ))}

            {filteredLeads.length === 0 && <div className="fv-row-sub">Nenhum lead encontrado.</div>}
          </div>

          <div className="fv-actions" style={{ marginTop: 16 }}>
            <button
              className="fv-ghost"
              type="button"
              onClick={() => loadLeads(Math.max(page - 1, 0))}
              disabled={loading || page === 0}
            >
              Pagina anterior
            </button>
            <button className="fv-ghost" type="button" onClick={() => loadLeads(page + 1)} disabled={loading}>
              Proxima pagina
            </button>
          </div>
        </div>

        <aside className="fv-panel fv-insights-panel">
          <div className="fv-panel-header">
            <h2>Insights</h2>
          </div>
          <div className="fv-table">
            <div className="fv-row">
              <div className="fv-row-main">
                <div className="fv-row-title">Total de leads</div>
                <div className="fv-row-sub">{insights.total}</div>
              </div>
            </div>
            <div className="fv-row">
              <div className="fv-row-main">
                <div className="fv-row-title">Leads validos</div>
                <div className="fv-row-sub">{insights.valid}</div>
              </div>
            </div>
            <div className="fv-row">
              <div className="fv-row-main">
                <div className="fv-row-title">Leads duplicados</div>
                <div className="fv-row-sub">{insights.duplicate}</div>
              </div>
            </div>
          </div>
        </aside>
      </section>

      {activeLead && (
        <div className="fv-modal-backdrop" onClick={closeLeadModal}>
          <div className="fv-modal" onClick={(event) => event.stopPropagation()}>
            <div className="fv-modal-header">
              <div className="fv-modal-title-wrap">
                <h2 className="fv-modal-title">Detalhes do lead</h2>
                <span className={`fv-status ${formLead.is_valid ? 'funnel-convertido' : 'funnel-novo'}`}>
                  {formLead.is_valid ? 'Qualificado' : 'Nao contatado'}
                </span>
              </div>
              <button className="fv-ghost small" type="button" onClick={closeLeadModal}>
                Fechar
              </button>
            </div>

            <div className="fv-modal-grid">
              <div className="fv-field">
                <label htmlFor="lead-campaign-status">Status de Campanha</label>
                <textarea
                  id="lead-campaign-status"
                  placeholder="Ex: Nao iniciada, Ativa, Pausada..."
                  value={formLead.campaign_status || ''}
                  onChange={(event) => setFormLead((prev) => ({ ...prev, campaign_status: event.target.value }))}
                />
              </div>
              <div className="fv-field">
                <label htmlFor="lead-prospect-notes">Observacoes</label>
                <textarea
                  id="lead-prospect-notes"
                  placeholder="Adicione observacoes da prospeccao..."
                  value={formLead.prospect_notes || ''}
                  onChange={(event) => setFormLead((prev) => ({ ...prev, prospect_notes: event.target.value }))}
                />
              </div>
              <div className="fv-field">
                <label htmlFor="lead-name">Nome</label>
                <input
                  id="lead-name"
                  value={formLead.name || ''}
                  onChange={(event) => setFormLead((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div className="fv-field">
                <label htmlFor="lead-company">Empresa</label>
                <input
                  id="lead-company"
                  value={formLead.company_name || ''}
                  onChange={(event) => setFormLead((prev) => ({ ...prev, company_name: event.target.value }))}
                />
              </div>
              <div className="fv-field">
                <label htmlFor="lead-phone">Telefone</label>
                <input
                  id="lead-phone"
                  value={formLead.phone || ''}
                  onChange={(event) => setFormLead((prev) => ({ ...prev, phone: event.target.value }))}
                />
              </div>
              <div className="fv-field">
                <label htmlFor="lead-email">Email</label>
                <input
                  id="lead-email"
                  value={formLead.email || ''}
                  onChange={(event) => setFormLead((prev) => ({ ...prev, email: event.target.value }))}
                />
              </div>
              <div className="fv-field">
                <label htmlFor="lead-state">Estado</label>
                <input
                  id="lead-state"
                  value={formLead.state || ''}
                  onChange={(event) => setFormLead((prev) => ({ ...prev, state: event.target.value }))}
                />
              </div>
              <div className="fv-field">
                <label htmlFor="lead-city">Cidade</label>
                <input
                  id="lead-city"
                  value={formLead.city || ''}
                  onChange={(event) => setFormLead((prev) => ({ ...prev, city: event.target.value }))}
                />
              </div>
              <div className="fv-field fv-field-full">
                <label htmlFor="lead-address">Endereco</label>
                <input
                  id="lead-address"
                  value={formLead.address || ''}
                  onChange={(event) => setFormLead((prev) => ({ ...prev, address: event.target.value }))}
                />
              </div>
              <div className="fv-field fv-field-full">
                <label htmlFor="lead-url">URL</label>
                <input
                  id="lead-url"
                  value={formLead.url || ''}
                  onChange={(event) => setFormLead((prev) => ({ ...prev, url: event.target.value }))}
                />
              </div>
              <div className="fv-field">
                <label htmlFor="lead-cnpj">CNPJ</label>
                <input
                  id="lead-cnpj"
                  value={formLead.cnpj || ''}
                  onChange={(event) => setFormLead((prev) => ({ ...prev, cnpj: event.target.value }))}
                />
              </div>
              <div className="fv-field">
                <label htmlFor="lead-source">Fonte</label>
                <input
                  id="lead-source"
                  value={formLead.source || ''}
                  onChange={(event) => setFormLead((prev) => ({ ...prev, source: event.target.value }))}
                />
              </div>
              <div className="fv-field">
                <label htmlFor="lead-captured">Capturado em</label>
                <input id="lead-captured" readOnly value={formatDateTime(formLead.captured_at)} />
              </div>
              <div className="fv-field">
                <label htmlFor="lead-updated">Atualizado em</label>
                <input id="lead-updated" readOnly value={formatDateTime(formLead.updated_at)} />
              </div>

              <label className="fv-check-label">
                <input
                  type="checkbox"
                  checked={!!formLead.is_valid}
                  onChange={(event) => setFormLead((prev) => ({ ...prev, is_valid: event.target.checked }))}
                />
                Lead valido
              </label>

              <label className="fv-check-label">
                <input
                  type="checkbox"
                  checked={!!formLead.is_duplicate}
                  onChange={(event) => setFormLead((prev) => ({ ...prev, is_duplicate: event.target.checked }))}
                />
                Marcado como duplicado
              </label>
            </div>

            {modalMessage && <div className="fv-message" style={{ marginTop: 12 }}>{modalMessage}</div>}

            <div className="fv-actions fv-modal-actions">
              <button className="fv-ghost" type="button" onClick={deleteLeadFromModal} disabled={saving || deleting}>
                {deleting ? 'Excluindo...' : 'Excluir lead'}
              </button>
              <button className="fv-ghost" type="button" onClick={exportActiveLead} disabled={saving || deleting}>
                Exportar
              </button>
              <button className="fv-ghost" type="button" onClick={closeLeadModal}>
                Cancelar
              </button>
              <button className="fv-primary" type="button" onClick={saveLead} disabled={saving || deleting}>
                {saving ? 'Salvando...' : 'Salvar alteracoes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
