import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout.jsx';
import './dashboard.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const statusClass = {
  Novo: 'novo',
  Qualificado: 'qualificado',
  'Em contato': 'em-contato',
};

const prospectStatusOptions = [
  { value: 'cliente', label: 'CLIENTE', className: 'cliente' },
  { value: 'contatado', label: 'CONTATADO', className: 'contatado' },
  { value: 'nao_contatado', label: 'NÃO CONTATADO', className: 'nao-contatado' },
  { value: 'fora_do_ramo', label: 'FORA DO RAMO', className: 'fora-do-ramo' },
];

const getProspectClass = (value) =>
  prospectStatusOptions.find((option) => option.value === value)?.className || 'nao-contatado';

const mapLead = (lead) => ({
  id: lead.id,
  source: lead.source || 'google_maps',
  name: lead.company_name || lead.name || '',
  company_name: lead.company_name || lead.name || '',
  city: lead.city || '',
  state: lead.state || '',
  phone: lead.phone || '',
  email: lead.email || '',
  address: lead.address || '',
  cnpj: lead.cnpj || '',
  url: lead.url || '',
  prospect_status: lead.prospect_status || 'nao_contatado',
  prospect_notes: lead.prospect_notes || '',
  campaign_status: lead.campaign_status || '',
  captured_at: lead.captured_at || null,
  created_at: lead.created_at || null,
  updated_at: lead.updated_at || null,
  is_valid: !!lead.is_valid,
  is_duplicate: !!lead.is_duplicate,
  status: lead.is_valid ? 'Qualificado' : 'Novo',
  score: lead.is_valid ? 80 : 60,
});

const formatDateTime = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('pt-BR');
};

export default function Leads({ onNavigate, activePath }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [search, setSearch] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [activeLead, setActiveLead] = useState(null);
  const [formLead, setFormLead] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const loadLeads = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/leads/?limit=300`);
      const payload = await response.json();
      if (response.ok && Array.isArray(payload?.leads)) {
        const mapped = payload.leads.map(mapLead);
        setLeads(mapped);
      }
    } catch (error) {
      // no-op
    } finally {
      setLoading(false);
      setLastUpdatedAt(new Date().toLocaleTimeString('pt-BR'));
    }
  };

  useEffect(() => {
    loadLeads();
    const onLeadsUpdated = () => loadLeads();
    const onStorage = (event) => {
      if (event.key === 'findvan.leads.lastRefresh') {
        loadLeads();
      }
    };
    window.addEventListener('findvan:leads-updated', onLeadsUpdated);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('findvan:leads-updated', onLeadsUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const stateOptions = useMemo(
    () => [...new Set(leads.map((lead) => lead.state).filter(Boolean))].sort(),
    [leads]
  );

  const cityOptions = useMemo(() => {
    const scoped = selectedState
      ? leads.filter((lead) => lead.state === selectedState)
      : leads;
    return [...new Set(scoped.map((lead) => lead.city).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'pt-BR')
    );
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
          lead.city,
          lead.state,
          lead.phone,
          lead.email,
          lead.address,
          lead.source,
          lead.cnpj,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [leads, selectedState, selectedCity, search]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredLeads.length / pageSize)), [filteredLeads.length]);
  const paginatedLeads = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, page]);

  useEffect(() => {
    setPage(1);
  }, [selectedState, selectedCity, search]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const openLeadModal = (lead) => {
    setActiveLead(lead);
    setFormLead({ ...lead });
    setModalMessage('');
  };

  const closeLeadModal = () => {
    setActiveLead(null);
    setFormLead(null);
    setModalMessage('');
  };

  const saveLead = async () => {
    if (!formLead) return;
    try {
      setSaving(true);
      setModalMessage('');
      const payload = {
        name: formLead.name || '',
        company_name: formLead.company_name || formLead.name || '',
        phone: formLead.phone || null,
        email: formLead.email || null,
        address: formLead.address || null,
        city: formLead.city || '',
        state: formLead.state || null,
        cnpj: formLead.cnpj || null,
        url: formLead.url || null,
        prospect_status: formLead.prospect_status || 'nao_contatado',
        prospect_notes: formLead.prospect_notes || null,
        campaign_status: formLead.campaign_status || null,
        is_valid: !!formLead.is_valid,
        is_duplicate: !!formLead.is_duplicate,
      };
      const response = await fetch(`${API_BASE}/api/leads/${formLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || 'Falha ao salvar lead');
      }
      setModalMessage('Lead atualizado com sucesso.');
      await loadLeads();
      if (data?.lead) {
        const updated = mapLead(data.lead);
        setActiveLead(updated);
        setFormLead(updated);
      }
      localStorage.setItem('findvan.leads.lastRefresh', String(Date.now()));
      window.dispatchEvent(new CustomEvent('findvan:leads-updated'));
    } catch (error) {
      setModalMessage(error?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const removeLead = async () => {
    if (!formLead) return;
    const confirmed = window.confirm(`Excluir lead "${formLead.name}"?`);
    if (!confirmed) return;
    try {
      setDeleting(true);
      setModalMessage('');
      const response = await fetch(`${API_BASE}/api/leads/${formLead.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || 'Falha ao excluir lead');
      }
      await loadLeads();
      closeLeadModal();
      localStorage.setItem('findvan.leads.lastRefresh', String(Date.now()));
      window.dispatchEvent(new CustomEvent('findvan:leads-updated'));
    } catch (error) {
      setModalMessage(error?.message || 'Erro ao excluir');
    } finally {
      setDeleting(false);
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
          <button className="fv-ghost" type="button" onClick={loadLeads}>
            {loading ? 'Atualizando...' : 'Atualizar leads'}
          </button>
        </div>
      </header>

      <section className="fv-panel fv-panel-compact">
        <div className="fv-inline-form">
          <select
            className="fv-input fv-input-state fv-select"
            value={selectedState}
            onChange={(event) => {
              setSelectedState(event.target.value);
              setSelectedCity('');
            }}
          >
            <option value="">Todos os estados</option>
            {stateOptions.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
          <select
            className="fv-input fv-select"
            value={selectedCity}
            onChange={(event) => setSelectedCity(event.target.value)}
          >
            <option value="">Todas as cidades</option>
            {cityOptions.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          <input
            className="fv-input fv-select"
            placeholder="Buscar por nome, empresa, telefone, email..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="fv-row-sub">
            {filteredLeads.length} leads • Atualizado as {lastUpdatedAt || '--:--:--'}
          </div>
        </div>
      </section>

      <section className="fv-columns">
        <div className="fv-panel">
          <div className="fv-panel-header">
            <h2>Pipeline</h2>
          </div>
          <div className="fv-table">
            {paginatedLeads.map((lead, index) => (
              <React.Fragment key={`${lead.id || lead.name}-${lead.city}-${index}`}>
              <button
                type="button"
                className="fv-row fv-row-button"
                onClick={() => openLeadModal(lead)}
              >
                <div className="fv-row-main">
                  <div className="fv-row-title">{lead.name}</div>
                  <div className="fv-row-sub">
                    {lead.company_name || lead.name}
                  </div>
                  <div className="fv-row-sub">
                    {lead.city || 'Cidade não informada'}
                    {lead.state ? ` • ${lead.state}` : ''} • {lead.phone || 'Sem telefone'}
                    {lead.email ? ` • ${lead.email}` : ''}
                  </div>
                  <div className="fv-row-sub">
                    {lead.address || 'Endereço não informado'} • Fonte {lead.source}
                  </div>
                </div>
                <div className={`fv-dot ${lead.prospect_status || 'nao_contatado'}`} />
                <div className="fv-row-chip">Score {lead.score}</div>
                <div className={`fv-status ${statusClass[lead.status] || ''}`}>{lead.status}</div>
              </button>
              </React.Fragment>
            ))}
            {paginatedLeads.length === 0 && (
              <div className="fv-row-sub">Nenhum lead encontrado com os filtros atuais.</div>
            )}
          </div>
          <div className="fv-pagination">
            <button
              className="fv-ghost small"
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
            >
              Anterior
            </button>
            <div className="fv-row-sub">
              Página {page} de {totalPages}
            </div>
            <button
              className="fv-ghost small"
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
            >
              Próxima
            </button>
          </div>
        </div>

        <div className="fv-panel">
          <div className="fv-panel-header">
            <h2>Insights</h2>
          </div>
          <div className="fv-activity">
            <div className="fv-activity-item">
              <div className="fv-activity-title">Total de leads</div>
              <div className="fv-row-sub">{leads.length}</div>
            </div>
            <div className="fv-activity-item">
              <div className="fv-activity-title">Leads validos</div>
              <div className="fv-row-sub">{leads.filter((lead) => lead.is_valid).length}</div>
            </div>
            <div className="fv-activity-item">
              <div className="fv-activity-title">Leads duplicados</div>
              <div className="fv-row-sub">
                {leads.filter((lead) => lead.is_duplicate).length}
              </div>
            </div>
          </div>
        </div>
      </section>

      {activeLead && formLead && (
        <div className="fv-modal-backdrop" onClick={closeLeadModal}>
          <div className="fv-modal" onClick={(event) => event.stopPropagation()}>
            <div className="fv-panel-header">
              <div className="fv-modal-title-wrap">
                <h2 className="fv-modal-title">DETALHES DO LEAD</h2>
                <select
                  className={`fv-prospect-pill fv-state-inline ${getProspectClass(
                    formLead.prospect_status
                  )}`}
                  value={formLead.prospect_status || 'nao_contatado'}
                  onChange={(event) =>
                    setFormLead((prev) => ({ ...prev, prospect_status: event.target.value }))
                  }
                >
                  {prospectStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <button className="fv-ghost small" type="button" onClick={closeLeadModal}>
                ✕ Fechar
              </button>
            </div>
            <div className="fv-prospect-bar">
              <div className="fv-field fv-prospect-notes">
                <span>Status de Campanha</span>
                <textarea
                  className="fv-input fv-textarea"
                  placeholder="Ex: Não iniciada, Ativa, Pausada..."
                  value={formLead.campaign_status || ''}
                  onChange={(event) =>
                    setFormLead((prev) => ({ ...prev, campaign_status: event.target.value }))
                  }
                />
              </div>
              <label className="fv-field fv-prospect-notes">
                <span>Observações</span>
                <textarea
                  className="fv-input fv-textarea"
                  placeholder="Adicione observações da prospecção..."
                  value={formLead.prospect_notes || ''}
                  onChange={(event) =>
                    setFormLead((prev) => ({ ...prev, prospect_notes: event.target.value }))
                  }
                />
              </label>
            </div>
            <div className="fv-modal-grid">
              <label className="fv-field">
                <span>Nome</span>
                <input
                  className="fv-input"
                  value={formLead.name}
                  onChange={(event) => setFormLead((prev) => ({ ...prev, name: event.target.value }))}
                />
              </label>
              <label className="fv-field">
                <span>Empresa</span>
                <input
                  className="fv-input"
                  value={formLead.company_name}
                  onChange={(event) =>
                    setFormLead((prev) => ({ ...prev, company_name: event.target.value }))
                  }
                />
              </label>
              <label className="fv-field">
                <span>Telefone</span>
                <input
                  className="fv-input"
                  value={formLead.phone}
                  onChange={(event) => setFormLead((prev) => ({ ...prev, phone: event.target.value }))}
                />
              </label>
              <label className="fv-field">
                <span>Email</span>
                <input
                  className="fv-input"
                  value={formLead.email}
                  onChange={(event) => setFormLead((prev) => ({ ...prev, email: event.target.value }))}
                />
              </label>
              <label className="fv-field">
                <span>Estado</span>
                <input
                  className="fv-input"
                  value={formLead.state}
                  onChange={(event) =>
                    setFormLead((prev) => ({ ...prev, state: event.target.value.toUpperCase().slice(0, 2) }))
                  }
                />
              </label>
              <label className="fv-field">
                <span>Cidade</span>
                <input
                  className="fv-input"
                  value={formLead.city}
                  onChange={(event) => setFormLead((prev) => ({ ...prev, city: event.target.value }))}
                />
              </label>
              <label className="fv-field fv-field-full">
                <span>Endereco</span>
                <input
                  className="fv-input"
                  value={formLead.address}
                  onChange={(event) => setFormLead((prev) => ({ ...prev, address: event.target.value }))}
                />
              </label>
              <label className="fv-field fv-field-full">
                <span>URL</span>
                <input
                  className="fv-input"
                  value={formLead.url}
                  onChange={(event) => setFormLead((prev) => ({ ...prev, url: event.target.value }))}
                />
                {formLead.url ? (
                  <a
                    className="fv-link"
                    href={formLead.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir link em nova aba
                  </a>
                ) : null}
              </label>
              <label className="fv-field">
                <span>CNPJ</span>
                <input
                  className="fv-input"
                  value={formLead.cnpj}
                  onChange={(event) => setFormLead((prev) => ({ ...prev, cnpj: event.target.value }))}
                />
              </label>
              <label className="fv-field">
                <span>Fonte</span>
                <input className="fv-input" value={formLead.source} disabled />
              </label>
              <label className="fv-field">
                <span>Capturado em</span>
                <input className="fv-input" value={formatDateTime(formLead.captured_at)} disabled />
              </label>
              <label className="fv-field">
                <span>Atualizado em</span>
                <input className="fv-input" value={formatDateTime(formLead.updated_at)} disabled />
              </label>
              <label className="fv-field">
                <span className="fv-check-label">
                  <input
                    type="checkbox"
                    checked={!!formLead.is_valid}
                    onChange={(event) =>
                      setFormLead((prev) => ({ ...prev, is_valid: event.target.checked }))
                    }
                  />
                  Lead válido
                </span>
              </label>
              <label className="fv-field">
                <span className="fv-check-label">
                  <input
                    type="checkbox"
                    checked={!!formLead.is_duplicate}
                    onChange={(event) =>
                      setFormLead((prev) => ({ ...prev, is_duplicate: event.target.checked }))
                    }
                  />
                  Marcado como duplicado
                </span>
              </label>
            </div>

            {modalMessage && <div className="fv-message">{modalMessage}</div>}

            <div className="fv-actions fv-modal-actions">
              <button className="fv-ghost" type="button" onClick={removeLead} disabled={deleting}>
                {deleting ? 'Excluindo...' : 'Excluir lead'}
              </button>
              <button className="fv-primary" type="button" onClick={saveLead} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar alteracoes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
