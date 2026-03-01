import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout.jsx';
import ScoreBadge from '../components/ScoreBadge.jsx';
import ScoreBreakdown from '../components/ScoreBreakdown.jsx';
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
};

const formatDateTime = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('pt-BR');
};

export default function Leads({ onNavigate, activePath }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [page, setPage] = useState(0);
  const [leads, setLeads] = useState([]);

  const [selectedCity, setSelectedCity] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedValidity, setSelectedValidity] = useState('');
  const [search, setSearch] = useState('');

  const [activeLead, setActiveLead] = useState(null);
  const [formLead, setFormLead] = useState(initialForm);
  const [scoreBreakdown, setScoreBreakdown] = useState(null);
  const [modalMessage, setModalMessage] = useState('');
  const [newTag, setNewTag] = useState('');

  const [didHandleLeadQuery, setDidHandleLeadQuery] = useState(false);

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
    } catch (error) {
      setErrorMessage(error?.message || 'Falha ao carregar leads.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads(0);
  }, []);

  const cities = useMemo(
    () => [...new Set(leads.map((lead) => lead.city).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [leads]
  );

  const sources = useMemo(
    () => [...new Set(leads.map((lead) => lead.source).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [leads]
  );

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (selectedCity && lead.city !== selectedCity) return false;
      if (selectedSource && lead.source !== selectedSource) return false;
      if (selectedValidity === 'valid' && !lead.is_valid) return false;
      if (selectedValidity === 'invalid' && lead.is_valid) return false;
      if (search.trim()) {
        const term = search.trim().toLowerCase();
        const haystack = [
          lead.name,
          lead.company_name,
          lead.phone,
          lead.email,
          lead.city,
          lead.state,
          ...(lead.tags || []),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [leads, search, selectedCity, selectedSource, selectedValidity]);

  const openLeadModal = async (lead) => {
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
      tags: Array.isArray(lead.tags) ? lead.tags : [],
      score: lead.score || 0,
      captured_at: lead.captured_at,
      updated_at: lead.updated_at,
    });
    setModalMessage('');
    setNewTag('');

    try {
      const response = await fetch(`${API_BASE}/api/leads/${lead.id}/score`);
      const payload = await response.json();
      if (response.ok) {
        setScoreBreakdown(payload?.breakdown || null);
      } else {
        setScoreBreakdown(null);
      }
    } catch {
      setScoreBreakdown(null);
    }
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
    setScoreBreakdown(null);
    setModalMessage('');
    setNewTag('');
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

  const addTag = async () => {
    if (!activeLead?.id) return;
    const tag = newTag.trim();
    if (!tag) return;
    setModalMessage('');
    try {
      const response = await fetch(`${API_BASE}/api/leads/${activeLead.id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.detail || 'Falha ao adicionar tag.');
      }
      const tags = Array.isArray(payload?.tags) ? payload.tags : [];
      setLeads((prev) => prev.map((lead) => (lead.id === activeLead.id ? { ...lead, tags } : lead)));
      setFormLead((prev) => ({ ...prev, tags }));
      setNewTag('');
    } catch (error) {
      setModalMessage(error?.message || 'Falha ao adicionar tag.');
    }
  };

  const removeTag = async (tag) => {
    if (!activeLead?.id || !tag) return;
    setModalMessage('');
    try {
      const response = await fetch(`${API_BASE}/api/leads/${activeLead.id}/tags/${encodeURIComponent(tag)}`, {
        method: 'DELETE',
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.detail || 'Falha ao remover tag.');
      }
      const tags = Array.isArray(payload?.tags) ? payload.tags : [];
      setLeads((prev) => prev.map((lead) => (lead.id === activeLead.id ? { ...lead, tags } : lead)));
      setFormLead((prev) => ({ ...prev, tags }));
    } catch (error) {
      setModalMessage(error?.message || 'Falha ao remover tag.');
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

  return (
    <Layout onNavigate={onNavigate} activePath={activePath}>
      <header className="fv-header">
        <div>
          <h1>Leads</h1>
          <p>Base de contatos com dados cadastrais, score e tags.</p>
        </div>
        <div className="fv-actions">
          <button className="fv-ghost" type="button" onClick={() => loadLeads(page)}>
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
          <button className="fv-primary" type="button" onClick={exportLeads}>
            Exportar
          </button>
        </div>
      </header>

      {errorMessage && <div className="fv-message">{errorMessage}</div>}
      {successMessage && <div className="fv-message">{successMessage}</div>}

      <section className="fv-filters">
        <div className="fv-field">
          <label htmlFor="filter-city">Cidade</label>
          <select id="filter-city" value={selectedCity} onChange={(event) => setSelectedCity(event.target.value)}>
            <option value="">Todas</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        <div className="fv-field">
          <label htmlFor="filter-source">Fonte</label>
          <select id="filter-source" value={selectedSource} onChange={(event) => setSelectedSource(event.target.value)}>
            <option value="">Todas</option>
            {sources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </div>

        <div className="fv-field">
          <label htmlFor="filter-validity">Validade</label>
          <select id="filter-validity" value={selectedValidity} onChange={(event) => setSelectedValidity(event.target.value)}>
            <option value="">Todos</option>
            <option value="valid">Validos</option>
            <option value="invalid">Invalidos</option>
          </select>
        </div>

        <div className="fv-field fv-field-search">
          <label htmlFor="filter-search">Busca</label>
          <input
            id="filter-search"
            placeholder="Nome, empresa, telefone, email, tags"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </section>

      <section className="fv-row-sub" style={{ marginBottom: 12 }}>
        Mostrando <strong>{filteredLeads.length}</strong> leads (pagina {page + 1})
      </section>

      <section className="fv-leads-list">
        {filteredLeads.map((lead) => (
          <article key={lead.id} className="fv-lead-card">
            <div className="fv-lead-top">
              <div>
                <h3>{lead.name || lead.company_name || `Lead ${lead.id}`}</h3>
                <div className="fv-row-sub">
                  {lead.company_name || '--'} • {lead.city || '--'} {lead.state || ''}
                </div>
              </div>
              <ScoreBadge score={lead.score} />
            </div>

            <div className="fv-lead-meta">
              <span>{lead.phone || '--'}</span>
              <span>{lead.email || '--'}</span>
              <span>{lead.source || '--'}</span>
              <span className={lead.is_valid ? 'fv-status funnel-convertido' : 'fv-status funnel-perdido'}>
                {lead.is_valid ? 'Valido' : 'Invalido'}
              </span>
            </div>

            <div className="fv-lead-tags">
              {(lead.tags || []).length > 0 ? (
                lead.tags.map((tag) => (
                  <span key={tag} className="fv-chip">
                    #{tag}
                  </span>
                ))
              ) : (
                <span className="fv-row-sub">Sem tags</span>
              )}
            </div>

            <div className="fv-actions" style={{ marginTop: 8 }}>
              <button className="fv-ghost small" type="button" onClick={() => openLeadModal(lead)}>
                Editar
              </button>
            </div>
          </article>
        ))}

        {filteredLeads.length === 0 && <div className="fv-row-sub">Nenhum lead encontrado.</div>}
      </section>

      <section className="fv-actions" style={{ marginTop: 16 }}>
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
      </section>

      {activeLead && (
        <div className="fv-modal-backdrop" onClick={closeLeadModal}>
          <div className="fv-modal" onClick={(event) => event.stopPropagation()}>
            <div className="fv-modal-header">
              <h2 className="fv-modal-title">Editar Lead #{activeLead.id}</h2>
              <button className="fv-ghost small" type="button" onClick={closeLeadModal}>
                Fechar
              </button>
            </div>

            <div className="fv-modal-grid">
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
                <label htmlFor="lead-city">Cidade</label>
                <input
                  id="lead-city"
                  value={formLead.city || ''}
                  onChange={(event) => setFormLead((prev) => ({ ...prev, city: event.target.value }))}
                />
              </div>
              <div className="fv-field">
                <label htmlFor="lead-state">UF</label>
                <input
                  id="lead-state"
                  value={formLead.state || ''}
                  onChange={(event) => setFormLead((prev) => ({ ...prev, state: event.target.value }))}
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
                <label htmlFor="lead-address">Endereco</label>
                <input
                  id="lead-address"
                  value={formLead.address || ''}
                  onChange={(event) => setFormLead((prev) => ({ ...prev, address: event.target.value }))}
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
                <label htmlFor="lead-url">URL</label>
                <input
                  id="lead-url"
                  value={formLead.url || ''}
                  onChange={(event) => setFormLead((prev) => ({ ...prev, url: event.target.value }))}
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

              <label className="fv-field fv-field-inline">
                <input
                  type="checkbox"
                  checked={!!formLead.is_valid}
                  onChange={(event) => setFormLead((prev) => ({ ...prev, is_valid: event.target.checked }))}
                />
                <span>Lead valido</span>
              </label>

              <label className="fv-field fv-field-inline">
                <input
                  type="checkbox"
                  checked={!!formLead.is_duplicate}
                  onChange={(event) => setFormLead((prev) => ({ ...prev, is_duplicate: event.target.checked }))}
                />
                <span>Duplicado</span>
              </label>
            </div>

            <div className="fv-row-sub" style={{ marginTop: 12 }}>
              Capturado em {formatDateTime(formLead.captured_at)} • Atualizado em {formatDateTime(formLead.updated_at)}
            </div>

            <div style={{ marginTop: 16 }}>
              <h3 className="fv-row-sub">Score</h3>
              <ScoreBadge score={formLead.score || 0} />
              <ScoreBreakdown breakdown={scoreBreakdown} />
            </div>

            <div style={{ marginTop: 16 }}>
              <h3 className="fv-row-sub">Tags</h3>
              <div className="fv-lead-tags">
                {(formLead.tags || []).map((tag) => (
                  <button key={tag} type="button" className="fv-chip" onClick={() => removeTag(tag)}>
                    #{tag} ✕
                  </button>
                ))}
                {(formLead.tags || []).length === 0 && <span className="fv-row-sub">Sem tags</span>}
              </div>
              <div className="fv-actions" style={{ marginTop: 8 }}>
                <input
                  placeholder="Nova tag"
                  value={newTag}
                  onChange={(event) => setNewTag(event.target.value)}
                />
                <button className="fv-ghost small" type="button" onClick={addTag}>
                  Adicionar tag
                </button>
              </div>
            </div>

            {modalMessage && <div className="fv-message">{modalMessage}</div>}

            <div className="fv-actions fv-modal-actions">
              <button className="fv-ghost" type="button" onClick={closeLeadModal}>
                Cancelar
              </button>
              <button className="fv-primary" type="button" onClick={saveLead} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
