import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout.jsx';
import './dashboard.css';
import { API_BASE } from '../lib/apiBase.js';
import { addMessagingActivity } from '../lib/messagingActivity.js';

const prospectStatusOptions = [
  { value: 'cliente', label: 'CLIENTE', className: 'cliente' },
  { value: 'contatado', label: 'CONTATADO', className: 'contatado' },
  { value: 'nao_contatado', label: 'NÃO CONTATADO', className: 'nao-contatado' },
  { value: 'fora_do_ramo', label: 'FORA DO RAMO', className: 'fora-do-ramo' },
];

const funnelStatusOptions = [
  { value: 'novo', label: 'Novo', className: 'funnel-novo' },
  { value: 'contactado', label: 'Contactado', className: 'funnel-contactado' },
  { value: 'respondeu', label: 'Respondeu', className: 'funnel-respondeu' },
  { value: 'interessado', label: 'Interessado', className: 'funnel-interessado' },
  { value: 'convertido', label: 'Convertido', className: 'funnel-convertido' },
  { value: 'perdido', label: 'Perdido', className: 'funnel-perdido' },
];

const funnelTransitions = {
  novo: ['contactado', 'perdido'],
  contactado: ['respondeu', 'perdido'],
  respondeu: ['interessado', 'perdido'],
  interessado: ['convertido', 'perdido'],
  convertido: ['perdido'],
  perdido: ['novo'],
};

const lossReasonOptions = [
  { value: 'sem_interesse', label: 'Sem interesse' },
  { value: 'ja_tem_fornecedor', label: 'Já tem fornecedor' },
  { value: 'preco_alto', label: 'Preço alto' },
  { value: 'sem_resposta_3_tentativas', label: 'Sem resposta (3 tentativas)' },
  { value: 'numero_invalido_ou_bloqueado', label: 'Número inválido/bloqueado' },
  { value: 'outro', label: 'Outro' },
];

const scoreRanges = [
  { value: 'all', label: 'Score: Todos' },
  { value: 'excellent', label: '90-100 (Excelente)' },
  { value: 'good', label: '70-89 (Bom)' },
  { value: 'regular', label: '50-69 (Regular)' },
  { value: 'weak', label: '< 50 (Fraco)' },
];

const followUpFilterOptions = [
  { value: 'all', label: 'Follow-up: Todos' },
  { value: 'overdue', label: 'Follow-up: Vencido' },
  { value: 'today', label: 'Follow-up: Hoje' },
  { value: 'upcoming', label: 'Follow-up: Próximos' },
  { value: 'none', label: 'Follow-up: Sem agenda' },
];

const modalTabs = [
  { value: 'dados', label: 'Dados' },
  { value: 'historico', label: 'Histórico' },
  { value: 'score', label: 'Score' },
  { value: 'notas', label: 'Notas' },
];

const SESSION_FILTER_KEY = 'findvan.leads.filters.v1';

const getProspectClass = (value) =>
  prospectStatusOptions.find((option) => option.value === value)?.className || 'nao-contatado';

const getFunnelClass = (value) =>
  funnelStatusOptions.find((option) => option.value === value)?.className || 'funnel-novo';

const getScoreMeta = (score) => {
  if (score >= 90) return { label: 'Excelente', className: 'excellent' };
  if (score >= 70) return { label: 'Bom', className: 'good' };
  if (score >= 50) return { label: 'Regular', className: 'regular' };
  return { label: 'Fraco', className: 'weak' };
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
    'score',
    'funnel_status',
    'captured_at',
  ];
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map((row) => headers.map((key) => escape(row[key])).join(','));
  return [headers.join(','), ...lines].join('\n');
};

const formatDateTime = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('pt-BR');
};

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
  tags: Array.isArray(lead.tags) ? lead.tags : [],
  prospect_status: lead.prospect_status || 'nao_contatado',
  prospect_notes: lead.prospect_notes || '',
  campaign_status: lead.campaign_status || '',
  captured_at: lead.captured_at || null,
  created_at: lead.created_at || null,
  updated_at: lead.updated_at || null,
  next_action_date: lead.next_action_date || null,
  next_action_description: lead.next_action_description || '',
  is_valid: !!lead.is_valid,
  is_duplicate: !!lead.is_duplicate,
  score: Number.isFinite(Number(lead.score)) ? Number(lead.score) : lead.is_valid ? 80 : 60,
  funnel_status: lead.funnel_status || 'novo',
  loss_reason: (lead.loss_reason || '').startsWith('outro:') ? 'outro' : lead.loss_reason || '',
  loss_reason_other: (lead.loss_reason || '').startsWith('outro:') ? (lead.loss_reason || '').slice(6) : '',
});

const getNextActionDateTimeValue = (dateValue) => {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  const iso = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString();
  return iso.slice(0, 16);
};

const getInteractionLabel = (type) => {
  const labels = {
    status_change: 'Mudança de status',
    msg_sent: 'Mensagem enviada',
    msg_received: 'Resposta recebida',
    note: 'Nota',
    scheduled: 'Agendamento',
  };
  return labels[type] || type;
};

const getInteractionContext = (item) => {
  if (!item || typeof item !== 'object') return '';
  const metadata = item.metadata && typeof item.metadata === 'object' ? item.metadata : {};
  if (item.type === 'status_change') {
    const from = metadata.old_status || 'n/d';
    const to = metadata.new_status || 'n/d';
    const reason = metadata.loss_reason ? ` • motivo: ${metadata.loss_reason}` : '';
    return `Transição: ${from} → ${to}${reason}`;
  }
  return '';
};

const isFollowUpOverdue = (lead) => {
  if (!lead.next_action_date) return false;
  const when = new Date(lead.next_action_date);
  if (Number.isNaN(when.getTime())) return false;
  return when < new Date() && !['convertido', 'perdido'].includes(lead.funnel_status);
};

const isFollowUpToday = (lead) => {
  if (!lead.next_action_date) return false;
  const when = new Date(lead.next_action_date);
  if (Number.isNaN(when.getTime())) return false;
  const now = new Date();
  return (
    when.getFullYear() === now.getFullYear() &&
    when.getMonth() === now.getMonth() &&
    when.getDate() === now.getDate() &&
    !isFollowUpOverdue(lead)
  );
};

const isFollowUpUpcoming = (lead) => {
  if (!lead.next_action_date) return false;
  const when = new Date(lead.next_action_date);
  if (Number.isNaN(when.getTime())) return false;
  if (isFollowUpOverdue(lead) || isFollowUpToday(lead)) return false;
  return when > new Date() && !['convertido', 'perdido'].includes(lead.funnel_status);
};

const getCadenceMeta = (lead) => {
  if (!lead || ['convertido', 'perdido'].includes(lead.funnel_status)) {
    return { label: 'Cadência encerrada', className: 'fv-risk-chip ok' };
  }
  if (isFollowUpOverdue(lead)) {
    return { label: 'Cadência vencida', className: 'fv-risk-chip high' };
  }
  if (isFollowUpToday(lead)) {
    return { label: 'Cadência hoje', className: 'fv-risk-chip warn' };
  }
  if (isFollowUpUpcoming(lead)) {
    return { label: 'Cadência planejada', className: 'fv-risk-chip ok' };
  }
  return { label: 'Sem próxima ação', className: 'fv-risk-chip warn' };
};

const getScoreBand = (score) => {
  if (score >= 90) return '90-100';
  if (score >= 70) return '70-89';
  if (score >= 50) return '50-69';
  return '<50';
};

const getPreferredNextFunnelStatus = (currentStatus) => {
  const preferredPath = {
    novo: 'contactado',
    contactado: 'respondeu',
    respondeu: 'interessado',
    interessado: 'convertido',
    convertido: 'perdido',
    perdido: 'novo',
  };
  return preferredPath[currentStatus] || null;
};

export default function Leads({ onNavigate, activePath }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [search, setSearch] = useState('');
  const [selectedScoreRange, setSelectedScoreRange] = useState('all');
  const [selectedFollowUpFilter, setSelectedFollowUpFilter] = useState('all');
  const [selectedFunnels, setSelectedFunnels] = useState([]);
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [activeAlertFilter, setActiveAlertFilter] = useState('');
  const [capturedDateFrom, setCapturedDateFrom] = useState('');
  const [capturedDateTo, setCapturedDateTo] = useState('');
  const [scoreSort, setScoreSort] = useState('desc');
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [batchBusy, setBatchBusy] = useState(false);
  const [campaignBatchModalOpen, setCampaignBatchModalOpen] = useState(false);
  const [campaignBatchStatus, setCampaignBatchStatus] = useState('Campanha Wave 2');
  const [batchResult, setBatchResult] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [activeLead, setActiveLead] = useState(null);
  const [formLead, setFormLead] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [scoreBreakdown, setScoreBreakdown] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [notes, setNotes] = useState([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [notesBusy, setNotesBusy] = useState(false);
  const [messagingBusy, setMessagingBusy] = useState(false);
  const [activeTab, setActiveTab] = useState('dados');
  const [tagDraft, setTagDraft] = useState('');
  const [requestedLeadId, setRequestedLeadId] = useState(null);
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
    try {
      const saved = sessionStorage.getItem(SESSION_FILTER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const validFunnels = Array.isArray(parsed.selectedFunnels)
          ? parsed.selectedFunnels.filter((item) => funnelStatusOptions.some((option) => option.value === item))
          : [];
        const validScoreRange = scoreRanges.some((option) => option.value === parsed.selectedScoreRange)
          ? parsed.selectedScoreRange
          : 'all';
        const validScoreSort = parsed.scoreSort === 'asc' || parsed.scoreSort === 'desc' ? parsed.scoreSort : 'desc';
        const validFollowUpFilter = followUpFilterOptions.some(
          (option) => option.value === parsed.selectedFollowUpFilter
        )
          ? parsed.selectedFollowUpFilter
          : 'all';
        setSelectedState(parsed.selectedState || '');
        setSelectedCity(parsed.selectedCity || '');
        setSearch(parsed.search || '');
        setSelectedScoreRange(validScoreRange);
        setSelectedFollowUpFilter(validFollowUpFilter);
        setSelectedFunnels(validFunnels);
        setSelectedSource(parsed.selectedSource || '');
        setSelectedTag(parsed.selectedTag || '');
        setActiveAlertFilter(parsed.activeAlertFilter || '');
        setCapturedDateFrom(parsed.capturedDateFrom || '');
        setCapturedDateTo(parsed.capturedDateTo || '');
        setScoreSort(validScoreSort);
      }
    } catch (error) {
      // no-op
    }

    const params = new URLSearchParams(window.location.search);
    const funnel = params.get('funnel');
    const leadId = params.get('leadId');
    if (funnel) {
      const values = funnel
        .split(',')
        .map((item) => item.trim())
        .filter((item) => funnelStatusOptions.some((option) => option.value === item));
      setSelectedFunnels(values);
    }
    if (leadId) {
      setRequestedLeadId(leadId);
    }

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

  useEffect(() => {
    if (!requestedLeadId || leads.length === 0) return;
    const target = leads.find((lead) => String(lead.id) === String(requestedLeadId));
    if (target) {
      openLeadModal(target);
    }
    setRequestedLeadId(null);
  }, [requestedLeadId, leads]);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        SESSION_FILTER_KEY,
        JSON.stringify({
          selectedState,
          selectedCity,
          search,
          selectedScoreRange,
          selectedFollowUpFilter,
          selectedFunnels,
          selectedSource,
          selectedTag,
          activeAlertFilter,
          capturedDateFrom,
          capturedDateTo,
          scoreSort,
        })
      );
    } catch (error) {
      // no-op
    }
  }, [
    selectedState,
    selectedCity,
    search,
    selectedScoreRange,
    selectedFollowUpFilter,
    selectedFunnels,
    selectedSource,
    selectedTag,
    activeAlertFilter,
    capturedDateFrom,
    capturedDateTo,
    scoreSort,
  ]);

  const stateOptions = useMemo(
    () => [...new Set(leads.map((lead) => lead.state).filter(Boolean))].sort(),
    [leads]
  );

  const cityOptions = useMemo(() => {
    const scoped = selectedState ? leads.filter((lead) => lead.state === selectedState) : leads;
    return [...new Set(scoped.map((lead) => lead.city).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'pt-BR')
    );
  }, [leads, selectedState]);

  const sourceOptions = useMemo(
    () =>
      [...new Set(leads.map((lead) => lead.source).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, 'pt-BR')
      ),
    [leads]
  );

  const tagOptions = useMemo(
    () =>
      [...new Set(leads.flatMap((lead) => (Array.isArray(lead.tags) ? lead.tags : [])))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [leads]
  );

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (selectedState && lead.state !== selectedState) return false;
      if (selectedCity && lead.city !== selectedCity) return false;
      if (selectedFunnels.length > 0 && !selectedFunnels.includes(lead.funnel_status)) return false;
      if (selectedSource && lead.source !== selectedSource) return false;
      if (selectedTag && !(lead.tags || []).includes(selectedTag)) return false;
      if (activeAlertFilter === 'overdue' && !isFollowUpOverdue(lead)) return false;
      if (selectedScoreRange === 'excellent' && !(lead.score >= 90)) return false;
      if (selectedScoreRange === 'good' && !(lead.score >= 70 && lead.score <= 89)) return false;
      if (selectedScoreRange === 'regular' && !(lead.score >= 50 && lead.score <= 69)) return false;
      if (selectedScoreRange === 'weak' && !(lead.score < 50)) return false;
      if (selectedFollowUpFilter === 'overdue' && !isFollowUpOverdue(lead)) return false;
      if (selectedFollowUpFilter === 'today' && !isFollowUpToday(lead)) return false;
      if (selectedFollowUpFilter === 'upcoming' && !isFollowUpUpcoming(lead)) return false;
      if (selectedFollowUpFilter === 'none' && !!lead.next_action_date) return false;

      const capturedDate = lead.captured_at || lead.created_at;
      if (capturedDateFrom) {
        const from = new Date(`${capturedDateFrom}T00:00:00`);
        if (!capturedDate || new Date(capturedDate) < from) return false;
      }
      if (capturedDateTo) {
        const to = new Date(`${capturedDateTo}T23:59:59`);
        if (!capturedDate || new Date(capturedDate) > to) return false;
      }

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
          ...(lead.tags || []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [
    leads,
    selectedState,
    selectedCity,
    selectedFunnels,
    selectedSource,
    selectedTag,
    activeAlertFilter,
    selectedScoreRange,
    selectedFollowUpFilter,
    capturedDateFrom,
    capturedDateTo,
    search,
  ]);

  const sortedLeads = useMemo(() => {
    const copy = [...filteredLeads];
    copy.sort((a, b) => {
      const overdueA = isFollowUpOverdue(a) ? 1 : 0;
      const overdueB = isFollowUpOverdue(b) ? 1 : 0;
      if (overdueA !== overdueB) return overdueB - overdueA;
      if (scoreSort === 'asc') return a.score - b.score;
      return b.score - a.score;
    });
    return copy;
  }, [filteredLeads, scoreSort]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(sortedLeads.length / pageSize)), [sortedLeads.length]);
  const paginatedLeads = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedLeads.slice(start, start + pageSize);
  }, [sortedLeads, page]);

  const insights = useMemo(() => {
    const scoped = filteredLeads;
    const statusCount = funnelStatusOptions.reduce((acc, status) => {
      acc[status.value] = scoped.filter((lead) => lead.funnel_status === status.value).length;
      return acc;
    }, {});

    const scoreDistribution = {
      '90-100': 0,
      '70-89': 0,
      '50-69': 0,
      '<50': 0,
    };

    scoped.forEach((lead) => {
      scoreDistribution[getScoreBand(lead.score)] += 1;
    });

    const cityMap = scoped.reduce((acc, lead) => {
      const key = [lead.city, lead.state].filter(Boolean).join(' • ');
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const topCities = Object.entries(cityMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const conversion = {
      novo_contactado: statusCount.novo ? Math.round((statusCount.contactado / statusCount.novo) * 100) : 0,
      contactado_respondeu: statusCount.contactado
        ? Math.round((statusCount.respondeu / statusCount.contactado) * 100)
        : 0,
      respondeu_interessado: statusCount.respondeu
        ? Math.round((statusCount.interessado / statusCount.respondeu) * 100)
        : 0,
      interessado_convertido: statusCount.interessado
        ? Math.round((statusCount.convertido / statusCount.interessado) * 100)
        : 0,
      total: scoped.length ? Math.round((statusCount.convertido / scoped.length) * 100) : 0,
    };

    return {
      total: scoped.length,
      valid: scoped.filter((lead) => lead.is_valid).length,
      duplicates: scoped.filter((lead) => lead.is_duplicate).length,
      statusCount,
      scoreDistribution,
      topCities,
      conversion,
      alerts: {
        pendingResponses: scoped.filter((lead) => lead.funnel_status === 'respondeu').length,
        overdueFollowups: scoped.filter((lead) => isFollowUpOverdue(lead)).length,
        newLeads: scoped.filter((lead) => lead.funnel_status === 'novo').length,
      },
    };
  }, [filteredLeads]);

  const workspaceStages = useMemo(() => {
    return funnelStatusOptions.map((status) => ({
      ...status,
      leads: sortedLeads.filter((lead) => lead.funnel_status === status.value),
    }));
  }, [sortedLeads]);

  useEffect(() => {
    setPage(1);
    setSelectedLeadIds([]);
  }, [
    selectedState,
    selectedCity,
    selectedFunnels,
    selectedSource,
    selectedTag,
    activeAlertFilter,
    selectedScoreRange,
    selectedFollowUpFilter,
    capturedDateFrom,
    capturedDateTo,
    scoreSort,
    search,
  ]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    const visibleIds = new Set(leads.map((lead) => lead.id));
    setSelectedLeadIds((prev) => prev.filter((id) => visibleIds.has(id)));
  }, [leads]);

  const openLeadModal = (lead) => {
    setActiveLead(lead);
    setFormLead({ ...lead });
    setModalMessage('');
    setScoreBreakdown(null);
    setInteractions([]);
    setNotes([]);
    setNoteDraft('');
    setActiveTab('dados');
  };

  const closeLeadModal = () => {
    setActiveLead(null);
    setFormLead(null);
    setModalMessage('');
    setScoreBreakdown(null);
    setInteractions([]);
    setNotes([]);
    setNoteDraft('');
    setActiveTab('dados');
  };

  useEffect(() => {
    if (!activeLead?.id) return;
    let cancelled = false;
    const loadLeadTabsData = async () => {
      try {
        const [scoreRes, interactionsRes, notesRes] = await Promise.all([
          fetch(`${API_BASE}/api/leads/${activeLead.id}/score`),
          fetch(`${API_BASE}/api/leads/${activeLead.id}/interactions?limit=30`),
          fetch(`${API_BASE}/api/leads/${activeLead.id}/notes?limit=50`),
        ]);

        const scorePayload = await scoreRes.json().catch(() => ({}));
        const interactionsPayload = await interactionsRes.json().catch(() => ({}));
        const notesPayload = await notesRes.json().catch(() => ({}));

        if (!cancelled && scoreRes.ok) setScoreBreakdown(scorePayload);
        if (!cancelled && interactionsRes.ok) {
          setInteractions(Array.isArray(interactionsPayload?.interactions) ? interactionsPayload.interactions : []);
        }
        if (!cancelled && notesRes.ok) {
          setNotes(Array.isArray(notesPayload?.notes) ? notesPayload.notes : []);
        }
      } catch (error) {
        // no-op
      }
    };

    loadLeadTabsData();

    return () => {
      cancelled = true;
    };
  }, [activeLead?.id]);

  const addNote = async () => {
    if (!activeLead?.id || !noteDraft.trim()) return;
    try {
      setNotesBusy(true);
      const response = await fetch(`${API_BASE}/api/leads/${activeLead.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteDraft.trim(), author: 'dashboard' }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.detail || 'Não foi possível salvar a nota.');
      setNoteDraft('');
      setNotes((prev) => [payload.note, ...prev]);
      setModalMessage('Nota adicionada com sucesso.');
    } catch (error) {
      setModalMessage(error?.message || 'Erro ao salvar nota.');
    } finally {
      setNotesBusy(false);
    }
  };

  const saveLead = async () => {
    if (!formLead) return;
    try {
      setSaving(true);
      setModalMessage('');

      if (formLead.funnel_status === 'perdido' && !formLead.loss_reason) {
        setModalMessage('Selecione um motivo de perda para continuar.');
        setSaving(false);
        return;
      }

      if (activeLead && formLead.funnel_status !== activeLead.funnel_status) {
        const confirmTransition = window.confirm(
          `Confirmar mudança de funil: ${activeLead.funnel_status} -> ${formLead.funnel_status}?`
        );
        if (!confirmTransition) {
          setSaving(false);
          return;
        }

        const transitionResponse = await fetch(`${API_BASE}/api/leads/${formLead.id}/funnel-status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            new_status: formLead.funnel_status,
            loss_reason: formLead.loss_reason || null,
            loss_reason_other: formLead.loss_reason_other || null,
            author: 'dashboard',
          }),
        });
        const transitionData = await transitionResponse.json();
        if (!transitionResponse.ok) {
          throw new Error(transitionData?.detail || 'Falha na transição de funil');
        }
      }

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
        funnel_status: formLead.funnel_status || 'novo',
        loss_reason:
          formLead.funnel_status === 'perdido'
            ? formLead.loss_reason === 'outro'
              ? `outro:${formLead.loss_reason_other || ''}`
              : formLead.loss_reason || null
            : null,
        prospect_status: formLead.prospect_status || 'nao_contatado',
        prospect_notes: formLead.prospect_notes || null,
        campaign_status: formLead.campaign_status || null,
        next_action_date: formLead.next_action_date || null,
        next_action_description: formLead.next_action_description || null,
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

  const clearFilters = () => {
    setSelectedState('');
    setSelectedCity('');
    setSearch('');
    setSelectedScoreRange('all');
    setSelectedFollowUpFilter('all');
    setSelectedFunnels([]);
    setSelectedSource('');
    setSelectedTag('');
    setActiveAlertFilter('');
    setCapturedDateFrom('');
    setCapturedDateTo('');
    setScoreSort('desc');
    setBatchResult(null);
    try {
      sessionStorage.removeItem(SESSION_FILTER_KEY);
    } catch (error) {
      // no-op
    }
  };

  const toggleLeadSelection = (leadId, checked) => {
    if (checked) {
      setSelectedLeadIds((prev) => (prev.includes(leadId) ? prev : [...prev, leadId]));
    } else {
      setSelectedLeadIds((prev) => prev.filter((id) => id !== leadId));
    }
  };

  const toggleSelectCurrentPage = (checked) => {
    const pageIds = paginatedLeads.map((lead) => lead.id).filter(Boolean);
    if (checked) {
      setSelectedLeadIds((prev) => [...new Set([...prev, ...pageIds])]);
    } else {
      setSelectedLeadIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    }
  };

  const exportSelectedLeads = async () => {
    if (selectedLeadIds.length === 0) return;
    try {
      setBatchBusy(true);
      const response = await fetch(`${API_BASE}/api/leads/batch/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedLeadIds }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.detail || 'Falha ao exportar leads.');

      const csv = toCsv(payload?.leads || []);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `findvan-leads-batch-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      const processed = Number(payload?.processed ?? selectedLeadIds.length);
      const exported = Number(payload?.exported ?? (payload?.leads || []).length);
      const failed = Number(payload?.failed ?? Math.max(processed - exported, 0));
      const errors = Array.isArray(payload?.errors) ? payload.errors : [];
      setBatchResult({
        type: failed > 0 ? 'warning' : 'success',
        summary:
          failed > 0
            ? `Exportação parcial: ${exported}/${processed} leads exportados (${failed} falhas).`
            : `Exportação concluída com ${exported}/${processed} leads.`,
        processed,
        updated: exported,
        failed,
        errors,
      });
    } catch (error) {
      setBatchResult({ type: 'error', summary: error?.message || 'Erro ao exportar lote.' });
    } finally {
      setBatchBusy(false);
    }
  };

  const batchUpdateStatus = async () => {
    if (selectedLeadIds.length === 0) return;
    const newStatus = window.prompt(
      'Novo status do funil (novo/contactado/respondeu/interessado/convertido/perdido):',
      'contactado'
    );
    if (!newStatus) return;

    let lossReason = null;
    if (newStatus === 'perdido') {
      lossReason = window.prompt(
        'Motivo de perda (sem_interesse/ja_tem_fornecedor/preco_alto/sem_resposta_3_tentativas/numero_invalido_ou_bloqueado/outro):',
        'sem_interesse'
      );
      if (!lossReason) return;
    }

    try {
      setBatchBusy(true);
      const response = await fetch(`${API_BASE}/api/leads/batch/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedLeadIds,
          new_status: newStatus,
          loss_reason: lossReason,
          author: 'dashboard-batch',
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.detail || 'Falha ao atualizar status em lote.');
      const processed = Number(payload?.processed ?? selectedLeadIds.length);
      const updated = Number(payload?.updated ?? 0);
      const failed = Number(payload?.failed ?? Math.max(processed - updated, 0));
      const errors = Array.isArray(payload?.errors) ? payload.errors : [];
      setBatchResult({
        type: failed > 0 ? 'warning' : 'success',
        summary:
          failed > 0
            ? `Status atualizado parcialmente: ${updated}/${processed} (${failed} falhas).`
            : `Status atualizado em ${updated}/${processed} leads.`,
        processed,
        updated,
        failed,
        errors,
      });
      setSelectedLeadIds([]);
      await loadLeads();
    } catch (error) {
      setBatchResult({ type: 'error', summary: error?.message || 'Erro no batch de status.' });
    } finally {
      setBatchBusy(false);
    }
  };

  const openBatchCampaignModal = () => {
    if (selectedLeadIds.length === 0 || batchBusy) return;
    setBatchResult(null);
    setCampaignBatchModalOpen(true);
  };

  const batchUpdateCampaign = async () => {
    if (selectedLeadIds.length === 0) return;
    const campaignStatus = campaignBatchStatus.trim();
    if (!campaignStatus) {
      setBatchResult({
        type: 'error',
        summary: 'Informe o nome/status da campanha antes de confirmar.',
      });
      return;
    }

    try {
      setBatchBusy(true);
      setBatchResult(null);
      const response = await fetch(`${API_BASE}/api/leads/batch/campaign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedLeadIds, campaign_status: campaignStatus }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.detail || 'Falha ao atualizar campanha em lote.');

      const processed = Number(payload?.processed ?? selectedLeadIds.length);
      const updated = Number(payload?.updated ?? 0);
      const failed = Number(payload?.failed ?? Math.max(processed - updated, 0));
      const errors = Array.isArray(payload?.errors) ? payload.errors : [];
      setBatchResult({
        type: failed > 0 ? 'warning' : 'success',
        summary:
          failed > 0
            ? `Execução parcial: ${updated}/${processed} leads atualizados (${failed} falhas).`
            : `Campanha aplicada com sucesso em ${updated}/${processed} leads.`,
        processed,
        updated,
        failed,
        errors,
      });

      setCampaignBatchModalOpen(false);
      setSelectedLeadIds([]);
      await loadLeads();
    } catch (error) {
      setBatchResult({
        type: 'error',
        summary: error?.message || 'Erro no batch de campanha.',
      });
    } finally {
      setBatchBusy(false);
    }
  };

  const batchDeleteLeads = async () => {
    if (selectedLeadIds.length === 0) return;
    const confirmed = window.confirm(`Excluir (soft delete) ${selectedLeadIds.length} leads selecionados?`);
    if (!confirmed) return;

    try {
      setBatchBusy(true);
      const response = await fetch(`${API_BASE}/api/leads/batch/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedLeadIds }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.detail || 'Falha ao excluir leads em lote.');
      const processed = Number(payload?.processed ?? selectedLeadIds.length);
      const deleted = Number(payload?.deleted ?? 0);
      const failed = Number(payload?.failed ?? Math.max(processed - deleted, 0));
      const errors = Array.isArray(payload?.errors) ? payload.errors : [];
      setBatchResult({
        type: failed > 0 ? 'warning' : 'success',
        summary:
          failed > 0
            ? `Exclusão parcial: ${deleted}/${processed} leads removidos (${failed} falhas).`
            : `${deleted}/${processed} leads removidos.`,
        processed,
        updated: deleted,
        failed,
        errors,
      });
      setSelectedLeadIds([]);
      await loadLeads();
    } catch (error) {
      setBatchResult({ type: 'error', summary: error?.message || 'Erro no batch de exclusão.' });
    } finally {
      setBatchBusy(false);
    }
  };

  const batchApplyTag = async () => {
    if (selectedLeadIds.length === 0) return;
    const tag = window.prompt('Tag para aplicar nos leads selecionados:', 'prioridade alta');
    if (!tag || !tag.trim()) return;
    try {
      setBatchBusy(true);
      const response = await fetch(`${API_BASE}/api/leads/batch/tag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedLeadIds, tag: tag.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.detail || 'Falha ao aplicar tag em lote.');
      const processed = Number(payload?.processed ?? selectedLeadIds.length);
      const updated = Number(payload?.updated ?? 0);
      const failed = Number(payload?.failed ?? Math.max(processed - updated, 0));
      const errors = Array.isArray(payload?.errors) ? payload.errors : [];
      setBatchResult({
        type: failed > 0 ? 'warning' : 'success',
        summary:
          failed > 0
            ? `Tag aplicada parcialmente: ${updated}/${processed} leads (${failed} falhas).`
            : `Tag aplicada em ${updated}/${processed} leads.`,
        processed,
        updated,
        failed,
        errors,
      });
      await loadLeads();
    } catch (error) {
      setBatchResult({ type: 'error', summary: error?.message || 'Erro ao aplicar tag em lote.' });
    } finally {
      setBatchBusy(false);
    }
  };

  const addTagToActiveLead = async () => {
    if (!activeLead?.id || !tagDraft.trim()) return;
    try {
      const response = await fetch(`${API_BASE}/api/leads/${activeLead.id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: tagDraft.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.detail || 'Falha ao adicionar tag.');
      setTagDraft('');
      setFormLead((prev) => ({ ...prev, tags: payload.tags || [] }));
      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === activeLead.id ? { ...lead, tags: payload.tags || [] } : lead
        )
      );
    } catch (error) {
      setModalMessage(error?.message || 'Erro ao adicionar tag.');
    }
  };

  const removeTagFromActiveLead = async (tag) => {
    if (!activeLead?.id || !tag) return;
    try {
      const response = await fetch(`${API_BASE}/api/leads/${activeLead.id}/tags/${encodeURIComponent(tag)}`, {
        method: 'DELETE',
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.detail || 'Falha ao remover tag.');
      setFormLead((prev) => ({ ...prev, tags: payload.tags || [] }));
      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === activeLead.id ? { ...lead, tags: payload.tags || [] } : lead
        )
      );
    } catch (error) {
      setModalMessage(error?.message || 'Erro ao remover tag.');
    }
  };

  const handleAlertFilter = (type) => {
    setActiveAlertFilter(type);
    if (type === 'respondeu') {
      setSelectedFollowUpFilter('all');
      setSelectedFunnels(['respondeu']);
      return;
    }
    if (type === 'overdue') {
      setSelectedFollowUpFilter('overdue');
      setSelectedFunnels(['contactado', 'respondeu', 'interessado']);
      return;
    }
    if (type === 'novo') {
      setSelectedFollowUpFilter('all');
      setSelectedFunnels(['novo']);
    }
  };

  const sendMessageForLead = async (lead) => {
    if (!lead) return;

    if (!lead.phone) {
      setModalMessage('Este lead não possui telefone para envio de mensagem.');
      return;
    }

    const modeInput = window.prompt('Modo de envio (dry_run/live):', 'dry_run');
    if (!modeInput) return;
    const normalizedMode = modeInput.trim().toLowerCase();
    if (normalizedMode !== 'dry_run' && normalizedMode !== 'live') {
      setModalMessage('Modo inválido. Use dry_run ou live.');
      return;
    }

    const defaultText = `Olá, ${lead.name || lead.company_name || 'tudo bem'}? Podemos ajudar sua operação de transporte escolar.`;
    const content = window.prompt('Mensagem a ser enviada:', defaultText);
    if (!content || !content.trim()) return;

    try {
      setMessagingBusy(true);
      setModalMessage('');
      const response = await fetch(`${API_BASE}/api/integrations/messaging/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: String(lead.id),
          to: lead.phone,
          content: content.trim(),
          dry_run: normalizedMode === 'dry_run',
          provider: 'twilio',
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.detail || 'Falha ao enviar mensagem para o lead.');
      }

      setModalMessage(
        `Mensagem ${payload.mode === 'dry_run' ? 'simulada' : 'enviada'} via ${payload.provider}. Status: ${payload.receipt?.status || 'n/d'}.`
      );
      addMessagingActivity({
        lead_id: String(lead.id),
        to: lead.phone,
        provider: payload.provider,
        mode: payload.mode,
        status: payload?.receipt?.status || 'queued',
        message: content.trim(),
      });
    } catch (error) {
      const message = error?.message || 'Erro de envio para o lead.';
      setModalMessage(message);
      addMessagingActivity({
        lead_id: String(lead.id),
        to: lead.phone || '',
        provider: 'noop',
        mode: normalizedMode,
        status: 'failed',
        message: content.trim(),
        error: message,
      });
    } finally {
      setMessagingBusy(false);
    }
  };

  const handleContactLead = async (lead) => {
    openLeadModal(lead);
    await sendMessageForLead(lead);
  };

  const buildLeadUpdatePayload = (lead, overrides = {}) => {
    const merged = { ...lead, ...overrides };
    const normalizedLossReason =
      merged.funnel_status === 'perdido'
        ? merged.loss_reason === 'outro'
          ? `outro:${merged.loss_reason_other || ''}`
          : merged.loss_reason || null
        : null;
    return {
      name: merged.name || '',
      company_name: merged.company_name || merged.name || '',
      phone: merged.phone || null,
      email: merged.email || null,
      address: merged.address || null,
      city: merged.city || '',
      state: merged.state || null,
      cnpj: merged.cnpj || null,
      url: merged.url || null,
      funnel_status: merged.funnel_status || 'novo',
      loss_reason: normalizedLossReason,
      prospect_status: merged.prospect_status || 'nao_contatado',
      prospect_notes: merged.prospect_notes || null,
      campaign_status: merged.campaign_status || null,
      next_action_date: merged.next_action_date || null,
      next_action_description: merged.next_action_description || null,
      is_valid: !!merged.is_valid,
      is_duplicate: !!merged.is_duplicate,
    };
  };

  const updateLeadCadence = async (lead, cadenceUpdates) => {
    if (!lead?.id) return;
    try {
      setBatchBusy(true);
      const response = await fetch(`${API_BASE}/api/leads/${lead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildLeadUpdatePayload(lead, cadenceUpdates)),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.detail || 'Falha ao atualizar cadência.');
      }
      setBatchResult({
        type: 'success',
        summary: `Cadência atualizada para "${lead.name || lead.company_name || lead.id}".`,
      });
      await loadLeads();
    } catch (error) {
      setBatchResult({
        type: 'error',
        summary: error?.message || 'Erro ao atualizar cadência.',
      });
    } finally {
      setBatchBusy(false);
    }
  };

  const scheduleFollowUpInHours = async (lead, hours) => {
    const when = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    const cadenceText = `Follow-up automático em ${hours}h`;
    await updateLeadCadence(lead, {
      next_action_date: when,
      next_action_description: cadenceText,
    });
  };

  const applyLeadFunnelTransition = async ({ lead, newStatus }) => {
    if (!lead?.id || !newStatus) return;
    try {
      setBatchBusy(true);
      const response = await fetch(`${API_BASE}/api/leads/${lead.id}/funnel-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_status: newStatus,
          author: 'dashboard-workspace',
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.detail || 'Falha ao alterar estágio do lead.');
      }
      setBatchResult({
        type: 'success',
        summary: `Lead "${lead.name || lead.company_name || lead.id}" movido para ${newStatus}.`,
      });
      await loadLeads();
    } catch (error) {
      setBatchResult({
        type: 'error',
        summary: error?.message || 'Erro ao alterar estágio do lead.',
      });
    } finally {
      setBatchBusy(false);
    }
  };

  const moveLeadToNextStage = async (lead) => {
    const suggested = getPreferredNextFunnelStatus(lead?.funnel_status);
    if (!suggested) return;
    const confirm = window.confirm(
      `Avançar lead "${lead.name || lead.company_name || lead.id}" de ${lead.funnel_status} para ${suggested}?`
    );
    if (!confirm) return;
    await applyLeadFunnelTransition({ lead, newStatus: suggested });
  };

  return (
    <Layout onNavigate={onNavigate} activePath={activePath}>
      <header className="fv-header">
        <div>
          <h1>Leads</h1>
          <p>Gerencie todo o pipeline de prospecção em tempo real.</p>
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
            placeholder="Buscar por nome, empresa, telefone, email, tags..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            className="fv-input fv-select"
            value={selectedScoreRange}
            onChange={(event) => setSelectedScoreRange(event.target.value)}
          >
            {scoreRanges.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            className="fv-input fv-select"
            value={selectedFollowUpFilter}
            onChange={(event) => setSelectedFollowUpFilter(event.target.value)}
          >
            {followUpFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select className="fv-input fv-select" value={scoreSort} onChange={(event) => setScoreSort(event.target.value)}>
            <option value="desc">Ordenar score: maior primeiro</option>
            <option value="asc">Ordenar score: menor primeiro</option>
          </select>

          <div className="fv-funnel-filters">
            {funnelStatusOptions.map((option) => (
              <label key={option.value} className="fv-funnel-check">
                <input
                  type="checkbox"
                  checked={selectedFunnels.includes(option.value)}
                  onChange={(event) => {
                    if (event.target.checked) {
                      setSelectedFunnels((prev) => [...prev, option.value]);
                    } else {
                      setSelectedFunnels((prev) => prev.filter((item) => item !== option.value));
                    }
                  }}
                />
                {option.label}
              </label>
            ))}
          </div>

          <select
            className="fv-input fv-select"
            value={selectedSource}
            onChange={(event) => setSelectedSource(event.target.value)}
          >
            <option value="">Todas as fontes</option>
            {sourceOptions.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>

          <select
            className="fv-input fv-select"
            value={selectedTag}
            onChange={(event) => setSelectedTag(event.target.value)}
          >
            <option value="">Todas as tags</option>
            {tagOptions.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>

          <input className="fv-input fv-select" type="date" value={capturedDateFrom} onChange={(event) => setCapturedDateFrom(event.target.value)} />
          <input className="fv-input fv-select" type="date" value={capturedDateTo} onChange={(event) => setCapturedDateTo(event.target.value)} />

          <button className="fv-ghost small" type="button" onClick={clearFilters}>
            Limpar filtros
          </button>

          <div className="fv-row-sub">
            {sortedLeads.length} leads • Atualizado às {lastUpdatedAt || '--:--:--'}
          </div>
        </div>
      </section>

      <section className="fv-columns fv-columns-leads">
        <div className="fv-panel">
          <div className="fv-panel-header">
            <h2>Pipeline</h2>
            <label className="fv-check-label">
              <input
                type="checkbox"
                checked={paginatedLeads.length > 0 && paginatedLeads.every((lead) => selectedLeadIds.includes(lead.id))}
                onChange={(event) => toggleSelectCurrentPage(event.target.checked)}
              />
              Selecionar página
            </label>
          </div>

          {selectedLeadIds.length > 0 && (
            <div className="fv-batch-bar">
              <div className="fv-row-sub">{selectedLeadIds.length} selecionados</div>
              <button className="fv-ghost small" type="button" disabled={batchBusy} onClick={batchUpdateStatus}>
                Alterar status
              </button>
              <button className="fv-ghost small" type="button" disabled={batchBusy} onClick={openBatchCampaignModal}>
                Adicionar campanha
              </button>
              <button className="fv-ghost small" type="button" disabled={batchBusy} onClick={batchApplyTag}>
                Tagear
              </button>
              <button className="fv-ghost small" type="button" disabled={batchBusy} onClick={exportSelectedLeads}>
                Exportar CSV
              </button>
              <button className="fv-primary" type="button" disabled={batchBusy} onClick={batchDeleteLeads}>
                Excluir
              </button>
            </div>
          )}

          {batchResult?.summary && (
            <div className={`fv-batch-feedback ${batchResult.type || 'success'}`}>
              <div className="fv-batch-feedback-title">{batchResult.summary}</div>
              {Number.isFinite(batchResult.processed) && (
                <div className="fv-row-sub">
                  Processados: {batchResult.processed} • Sucessos: {batchResult.updated || 0} • Falhas:{' '}
                  {batchResult.failed || 0}
                </div>
              )}
              {Array.isArray(batchResult.errors) && batchResult.errors.length > 0 && (
                <div className="fv-row-sub">
                  IDs com falha: {batchResult.errors.map((item) => item.id).join(', ')}
                </div>
              )}
            </div>
          )}

          <div className="fv-workspace-board">
            <div className="fv-panel-header">
              <h2>Workspace do Funil</h2>
              <div className="fv-row-sub">
                {selectedFunnels.length > 0
                  ? `Contexto ativo: ${selectedFunnels
                      .map((value) => funnelStatusOptions.find((option) => option.value === value)?.label || value)
                      .join(', ')}`
                  : 'Contexto ativo: todos os estágios'}
              </div>
            </div>

            <div className="fv-workspace-grid">
              {workspaceStages.map((stage) => (
                <section key={stage.value} className="fv-workspace-stage">
                  <div className="fv-workspace-stage-head">
                    <div className={`fv-status ${stage.className}`}>{stage.label}</div>
                    <div className="fv-row-chip">{stage.leads.length}</div>
                  </div>

                  <div className="fv-workspace-stage-actions">
                    <button
                      className="fv-ghost small"
                      type="button"
                      onClick={() => setSelectedFunnels([stage.value])}
                    >
                      Ver estágio
                    </button>
                    <button
                      className="fv-ghost small"
                      type="button"
                      onClick={() => {
                        setSelectedFunnels([]);
                        setActiveAlertFilter('');
                        setSelectedFollowUpFilter('all');
                      }}
                    >
                      Ver todos
                    </button>
                  </div>

                  <div className="fv-workspace-stage-list">
                    {stage.leads.slice(0, 3).map((lead) => (
                      <article key={`workspace-${stage.value}-${lead.id}`} className="fv-workspace-lead">
                        <div className="fv-row-title">{lead.name || lead.company_name || 'Sem nome'}</div>
                        <div className="fv-row-sub">
                          {lead.city || 'Cidade não informada'}
                          {lead.state ? ` • ${lead.state}` : ''}
                        </div>
                        <div className="fv-workspace-lead-actions">
                          <button className="fv-ghost small" type="button" onClick={() => handleContactLead(lead)}>
                            Contactar
                          </button>
                          <button className="fv-ghost small" type="button" onClick={() => openLeadModal(lead)}>
                            Ver
                          </button>
                          <button
                            className="fv-ghost small"
                            type="button"
                            disabled={batchBusy}
                            onClick={() => scheduleFollowUpInHours(lead, 24)}
                          >
                            +24h
                          </button>
                          <button
                            className="fv-ghost small"
                            type="button"
                            disabled={batchBusy}
                            onClick={() => moveLeadToNextStage(lead)}
                          >
                            Avançar
                          </button>
                        </div>
                      </article>
                    ))}
                    {stage.leads.length === 0 && (
                      <div className="fv-row-sub">Nenhum lead neste estágio com os filtros atuais.</div>
                    )}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <div className="fv-table">
            {paginatedLeads.map((lead, index) => {
              const scoreMeta = getScoreMeta(lead.score);
              const overdue = isFollowUpOverdue(lead);
              const replied = lead.funnel_status === 'respondeu';
              const cadenceMeta = getCadenceMeta(lead);
              const completeness = [
                { key: 'Telefone', ok: !!lead.phone },
                { key: 'Endereço', ok: !!lead.address },
              ].filter((item) => item.ok);

              return (
                <div
                  key={`${lead.id || lead.name}-${lead.city}-${index}`}
                  className={`fv-row fv-row-selectable fv-lead-card ${replied ? 'replied' : ''} ${overdue ? 'overdue' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedLeadIds.includes(lead.id)}
                    onChange={(event) => toggleLeadSelection(lead.id, event.target.checked)}
                  />

                  <div className="fv-row-main">
                    <div className="fv-row-title">{lead.name || 'Sem nome'}</div>
                    <div className="fv-row-sub">{lead.company_name || lead.name || 'Empresa não informada'}</div>
                    <div className="fv-row-sub">
                      {lead.city || 'Cidade não informada'}
                      {lead.state ? ` • ${lead.state}` : ''} • {lead.phone || 'Sem telefone'}
                    </div>
                    <div className="fv-row-sub">{lead.address || 'Endereço não informado'} • Fonte {lead.source}</div>

                    {completeness.length > 0 && (
                      <div className="fv-lead-completeness">
                        {completeness.map((item) => (
                          <span key={item.key} className="fv-complete-item ok">
                            ✓ {item.key}
                          </span>
                        ))}
                      </div>
                    )}

                    {lead.tags?.length > 0 && (
                      <div className="fv-lead-tags">
                        {lead.tags.slice(0, 4).map((tag) => (
                          <span key={`${lead.id}-${tag}`} className="fv-row-chip fv-row-chip-light">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {overdue && <div className="fv-alert-pill">Follow-up vencido</div>}
                    <div className="fv-row-sub">
                      Próxima ação:{' '}
                      {lead.next_action_date
                        ? `${formatDateTime(lead.next_action_date)}${lead.next_action_description ? ` • ${lead.next_action_description}` : ''}`
                        : 'não definida'}
                    </div>
                  </div>

                  <div className="fv-lead-right">
                    <div className={`fv-status ${getFunnelClass(lead.funnel_status)}`}>
                      {funnelStatusOptions.find((f) => f.value === lead.funnel_status)?.label || 'Novo'}
                    </div>
                    <div className={`fv-row-chip ${scoreMeta.className}`}>Score {lead.score} • {scoreMeta.label}</div>
                    <div className={`fv-row-chip ${cadenceMeta.className}`}>{cadenceMeta.label}</div>
                    <div className="fv-lead-actions">
                      <button className="fv-ghost small" type="button" onClick={() => handleContactLead(lead)}>
                        Contactar
                      </button>
                      <button className="fv-ghost small" type="button" onClick={() => openLeadModal(lead)}>
                        Ver
                      </button>
                      <button
                        className="fv-ghost small"
                        type="button"
                        disabled={batchBusy}
                        onClick={() => scheduleFollowUpInHours(lead, 24)}
                      >
                        +24h
                      </button>
                      <button
                        className="fv-ghost small"
                        type="button"
                        disabled={batchBusy}
                        onClick={() => updateLeadCadence(lead, { next_action_date: null, next_action_description: null })}
                      >
                        Limpar ação
                      </button>
                      <button className="fv-ghost small" type="button" onClick={() => window.alert('Menu rápido em evolução para a Wave 2.')}>
                        Menu...
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {paginatedLeads.length === 0 && (
              <div className="fv-row-sub">Nenhum lead encontrado com os filtros atuais.</div>
            )}
          </div>

          <div className="fv-pagination">
            <button className="fv-ghost small" type="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1}>
              Anterior
            </button>
            <div className="fv-row-sub">Página {page} de {totalPages}</div>
            <button className="fv-ghost small" type="button" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page >= totalPages}>
              Próxima
            </button>
          </div>
        </div>

        <aside className="fv-panel fv-insights-panel">
          <div className="fv-panel-header">
            <h2>Insights</h2>
          </div>

          <div className="fv-activity">
            <div className="fv-activity-item">
              <div className="fv-activity-title">Alertas</div>
              <button className="fv-alert-btn red" type="button" onClick={() => handleAlertFilter('respondeu')}>
                Respostas pendentes: {insights.alerts.pendingResponses}
              </button>
              <button className="fv-alert-btn yellow" type="button" onClick={() => handleAlertFilter('overdue')}>
                Follow-ups vencidos: {insights.alerts.overdueFollowups}
              </button>
              <button className="fv-alert-btn green" type="button" onClick={() => handleAlertFilter('novo')}>
                Novos leads: {insights.alerts.newLeads}
              </button>
              {activeAlertFilter && (
                <div className="fv-row-sub">
                  Filtro ativo: {activeAlertFilter}{' '}
                  <button
                    className="fv-ghost small"
                    type="button"
                    onClick={() => {
                      setActiveAlertFilter('');
                      setSelectedFunnels([]);
                      setSelectedFollowUpFilter('all');
                    }}
                  >
                    Limpar alerta
                  </button>
                </div>
              )}
            </div>

            <div className="fv-activity-item">
              <div className="fv-activity-title">Resumo</div>
              <div className="fv-row-sub">Total: {insights.total}</div>
              <div className="fv-row-sub">Válidos: {insights.valid}</div>
              <div className="fv-row-sub">Duplicados: {insights.duplicates}</div>
            </div>

            <div className="fv-activity-item">
              <div className="fv-activity-title">Por status</div>
              {funnelStatusOptions.map((status) => (
                <div key={status.value} className="fv-row-sub">
                  {status.label}: {insights.statusCount[status.value] || 0}
                </div>
              ))}
            </div>

            <div className="fv-activity-item">
              <div className="fv-activity-title">Conversão</div>
              <div className="fv-row-sub">Novo → Contactado: {insights.conversion.novo_contactado}%</div>
              <div className="fv-row-sub">Contactado → Respondeu: {insights.conversion.contactado_respondeu}%</div>
              <div className="fv-row-sub">Respondeu → Interessado: {insights.conversion.respondeu_interessado}%</div>
              <div className="fv-row-sub">Interessado → Convertido: {insights.conversion.interessado_convertido}%</div>
              <div className="fv-row-sub">Conversão total: {insights.conversion.total}%</div>
            </div>

            <div className="fv-activity-item">
              <div className="fv-activity-title">Distribuição de score</div>
              {Object.entries(insights.scoreDistribution).map(([band, count]) => (
                <div key={band} className="fv-row-sub">
                  {band}: {count}
                </div>
              ))}
            </div>

            <div className="fv-activity-item">
              <div className="fv-activity-title">Top cidades</div>
              {insights.topCities.length === 0 && <div className="fv-row-sub">Sem dados</div>}
              {insights.topCities.map(([city, count]) => (
                <div key={city} className="fv-row-sub">
                  {city}: {count}
                </div>
              ))}
            </div>

          </div>
        </aside>
      </section>

      {campaignBatchModalOpen && (
        <div className="fv-modal-backdrop" onClick={() => (batchBusy ? null : setCampaignBatchModalOpen(false))}>
          <div className="fv-modal fv-compact-modal" onClick={(event) => event.stopPropagation()}>
            <div className="fv-panel-header">
              <h2>Adicionar à campanha</h2>
              <button
                className="fv-ghost small"
                type="button"
                disabled={batchBusy}
                onClick={() => setCampaignBatchModalOpen(false)}
              >
                ✕ Fechar
              </button>
            </div>

            <div className="fv-field">
              <span>Campanha/Status alvo</span>
              <input
                className="fv-input"
                placeholder="Ex: Campanha Wave 7"
                value={campaignBatchStatus}
                onChange={(event) => setCampaignBatchStatus(event.target.value)}
                disabled={batchBusy}
              />
            </div>

            <div className="fv-message fv-message-neutral">
              Confirma aplicar a campanha <strong>{campaignBatchStatus || '—'}</strong> para{' '}
              <strong>{selectedLeadIds.length}</strong> leads selecionados?
            </div>

            <div className="fv-actions fv-modal-actions">
              <button className="fv-ghost" type="button" disabled={batchBusy} onClick={() => setCampaignBatchModalOpen(false)}>
                Cancelar
              </button>
              <button className="fv-primary" type="button" disabled={batchBusy} onClick={batchUpdateCampaign}>
                {batchBusy ? 'Executando...' : 'Confirmar execução'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeLead && formLead && (
        <div className="fv-modal-backdrop" onClick={closeLeadModal}>
          <div className="fv-modal" onClick={(event) => event.stopPropagation()}>
            <div className="fv-panel-header">
              <div className="fv-modal-title-wrap">
                <h2 className="fv-modal-title">DETALHES DO LEAD</h2>
                <select
                  className={`fv-prospect-pill fv-state-inline ${getProspectClass(formLead.prospect_status)}`}
                  value={formLead.prospect_status || 'nao_contatado'}
                  onChange={(event) => setFormLead((prev) => ({ ...prev, prospect_status: event.target.value }))}
                >
                  {prospectStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="fv-actions">
                <button
                  className="fv-ghost small"
                  type="button"
                  disabled={messagingBusy}
                  onClick={() => sendMessageForLead(formLead || activeLead)}
                >
                  {messagingBusy ? 'Enviando...' : 'Enviar mensagem'}
                </button>
                <button className="fv-ghost small" type="button" onClick={closeLeadModal}>
                  ✕ Fechar
                </button>
              </div>
            </div>

            <div className="fv-tabs">
              {modalTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  className={`fv-tab ${activeTab === tab.value ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.value)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'dados' && (
              <>
                <div className="fv-prospect-bar">
                  <div className="fv-field fv-prospect-notes">
                    <span>Status de Campanha</span>
                    <textarea
                      className="fv-input fv-textarea"
                      placeholder="Ex: Não iniciada, Ativa, Pausada..."
                      value={formLead.campaign_status || ''}
                      onChange={(event) => setFormLead((prev) => ({ ...prev, campaign_status: event.target.value }))}
                    />
                  </div>
                  <label className="fv-field fv-prospect-notes">
                    <span>Observações</span>
                    <textarea
                      className="fv-input fv-textarea"
                      placeholder="Adicione observações da prospecção..."
                      value={formLead.prospect_notes || ''}
                      onChange={(event) => setFormLead((prev) => ({ ...prev, prospect_notes: event.target.value }))}
                    />
                  </label>
                </div>

                <div className="fv-field fv-field-full">
                  <span>Tags</span>
                  <div className="fv-lead-tags">
                    {(formLead.tags || []).map((tag) => (
                      <button
                        key={`tag-${tag}`}
                        type="button"
                        className="fv-row-chip fv-row-chip-light fv-tag-remove"
                        onClick={() => removeTagFromActiveLead(tag)}
                      >
                        #{tag} ✕
                      </button>
                    ))}
                    {(formLead.tags || []).length === 0 && <span className="fv-row-sub">Sem tags.</span>}
                  </div>
                  <div className="fv-inline-form">
                    <input
                      className="fv-input"
                      list="fv-tag-options"
                      placeholder="Adicionar tag..."
                      value={tagDraft}
                      onChange={(event) => setTagDraft(event.target.value)}
                    />
                    <datalist id="fv-tag-options">
                      {tagOptions.map((tag) => (
                        <option key={`tag-opt-${tag}`} value={tag} />
                      ))}
                    </datalist>
                    <button className="fv-ghost small" type="button" onClick={addTagToActiveLead}>
                      Adicionar tag
                    </button>
                  </div>
                </div>

                <div className="fv-funnel-row">
                  <label className="fv-field">
                    <span>Status do Funil</span>
                    <select
                      className="fv-input fv-select"
                      value={formLead.funnel_status || 'novo'}
                      onChange={(event) => setFormLead((prev) => ({ ...prev, funnel_status: event.target.value }))}
                    >
                      {[formLead.funnel_status || 'novo', ...(funnelTransitions[formLead.funnel_status || 'novo'] || [])]
                        .filter((value, index, arr) => arr.indexOf(value) === index)
                        .map((value) => (
                          <option key={value} value={value}>
                            {funnelStatusOptions.find((f) => f.value === value)?.label || value}
                          </option>
                        ))}
                    </select>
                  </label>

                  {formLead.funnel_status === 'perdido' && (
                    <>
                      <label className="fv-field">
                        <span>Motivo de perda</span>
                        <select
                          className="fv-input fv-select"
                          value={formLead.loss_reason || ''}
                          onChange={(event) => setFormLead((prev) => ({ ...prev, loss_reason: event.target.value }))}
                        >
                          <option value="">Selecione</option>
                          {lossReasonOptions.map((reason) => (
                            <option key={reason.value} value={reason.value}>
                              {reason.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      {formLead.loss_reason === 'outro' && (
                        <label className="fv-field">
                          <span>Detalhe do motivo</span>
                          <input
                            className="fv-input"
                            value={formLead.loss_reason_other || ''}
                            onChange={(event) =>
                              setFormLead((prev) => ({ ...prev, loss_reason_other: event.target.value }))
                            }
                          />
                        </label>
                      )}
                    </>
                  )}
                </div>

                <div className="fv-modal-grid">
                  <label className="fv-field">
                    <span>Nome</span>
                    <input className="fv-input" value={formLead.name} onChange={(event) => setFormLead((prev) => ({ ...prev, name: event.target.value }))} />
                  </label>
                  <label className="fv-field">
                    <span>Empresa</span>
                    <input className="fv-input" value={formLead.company_name} onChange={(event) => setFormLead((prev) => ({ ...prev, company_name: event.target.value }))} />
                  </label>
                  <label className="fv-field">
                    <span>Telefone</span>
                    <input className="fv-input" value={formLead.phone} onChange={(event) => setFormLead((prev) => ({ ...prev, phone: event.target.value }))} />
                  </label>
                  <label className="fv-field">
                    <span>Email</span>
                    <input className="fv-input" value={formLead.email} onChange={(event) => setFormLead((prev) => ({ ...prev, email: event.target.value }))} />
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
                    <input className="fv-input" value={formLead.city} onChange={(event) => setFormLead((prev) => ({ ...prev, city: event.target.value }))} />
                  </label>
                  <label className="fv-field fv-field-full">
                    <span>Endereço</span>
                    <input className="fv-input" value={formLead.address} onChange={(event) => setFormLead((prev) => ({ ...prev, address: event.target.value }))} />
                  </label>
                  <label className="fv-field fv-field-full">
                    <span>URL</span>
                    <input className="fv-input" value={formLead.url} onChange={(event) => setFormLead((prev) => ({ ...prev, url: event.target.value }))} />
                    {formLead.url ? (
                      <a className="fv-link" href={formLead.url} target="_blank" rel="noopener noreferrer">
                        Abrir link em nova aba
                      </a>
                    ) : null}
                  </label>
                  <label className="fv-field">
                    <span>CNPJ</span>
                    <input className="fv-input" value={formLead.cnpj} onChange={(event) => setFormLead((prev) => ({ ...prev, cnpj: event.target.value }))} />
                  </label>
                  <label className="fv-field">
                    <span>Fonte</span>
                    <input className="fv-input" value={formLead.source} disabled />
                  </label>
                  <label className="fv-field">
                    <span>Próxima ação (data/hora)</span>
                    <input
                      className="fv-input"
                      type="datetime-local"
                      value={getNextActionDateTimeValue(formLead.next_action_date)}
                      onChange={(event) =>
                        setFormLead((prev) => ({
                          ...prev,
                          next_action_date: event.target.value ? new Date(event.target.value).toISOString() : null,
                        }))
                      }
                    />
                  </label>
                  <label className="fv-field">
                    <span>Próxima ação (descrição)</span>
                    <input
                      className="fv-input"
                      value={formLead.next_action_description || ''}
                      onChange={(event) =>
                        setFormLead((prev) => ({ ...prev, next_action_description: event.target.value }))
                      }
                    />
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
                      <input type="checkbox" checked={!!formLead.is_valid} onChange={(event) => setFormLead((prev) => ({ ...prev, is_valid: event.target.checked }))} />
                      Lead válido
                    </span>
                  </label>
                  <label className="fv-field">
                    <span className="fv-check-label">
                      <input type="checkbox" checked={!!formLead.is_duplicate} onChange={(event) => setFormLead((prev) => ({ ...prev, is_duplicate: event.target.checked }))} />
                      Marcado como duplicado
                    </span>
                  </label>
                </div>
              </>
            )}

            {activeTab === 'historico' && (
              <div className="fv-interactions">
                <div className="fv-activity-title">Histórico de interações</div>
                {interactions.length === 0 && <div className="fv-row-sub">Sem histórico ainda.</div>}
                {interactions.map((item) => (
                  <div key={item.id} className="fv-activity-item status-change">
                    <div className="fv-activity-head">
                      <div className="fv-activity-title">{getInteractionLabel(item.type)}</div>
                      <span className="fv-activity-time">{formatDateTime(item.created_at)}</span>
                    </div>
                    <div className="fv-row-sub">{item.content || 'Sem conteúdo'}</div>
                    {getInteractionContext(item) && <div className="fv-row-sub">{getInteractionContext(item)}</div>}
                    <div className="fv-row-sub">Autor: {item.author || 'sistema'}</div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'score' && (
              <div className="fv-score-breakdown">
                <div className={`fv-row-chip ${getScoreMeta(formLead.score).className}`}>
                  Score {formLead.score} • {getScoreMeta(formLead.score).label}
                </div>
                {scoreBreakdown?.breakdown ? (
                  <div className="fv-score-grid">
                    {Object.entries(scoreBreakdown.breakdown).map(([key, ok]) => (
                      <div key={key} className="fv-score-item">
                        <span>{ok ? '✓' : '✕'}</span>
                        <span>{key}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="fv-row-sub">Sem detalhamento de score.</div>
                )}
                <div className="fv-row-sub">Dica: para aumentar score, complete email, endereço e CNPJ.</div>
              </div>
            )}

            {activeTab === 'notas' && (
              <div className="fv-notes-tab">
                <div className="fv-field">
                  <span>Nova nota</span>
                  <textarea
                    className="fv-input fv-textarea"
                    placeholder="Registre contexto da negociação, objeções e próximos passos..."
                    value={noteDraft}
                    onChange={(event) => setNoteDraft(event.target.value)}
                  />
                  <div className="fv-actions">
                    <button className="fv-primary" type="button" onClick={addNote} disabled={notesBusy || !noteDraft.trim()}>
                      {notesBusy ? 'Salvando...' : 'Adicionar nota'}
                    </button>
                  </div>
                </div>

                <div className="fv-activity">
                  {notes.length === 0 && <div className="fv-row-sub">Nenhuma nota cadastrada.</div>}
                  {notes.map((note) => (
                    <div key={note.id} className="fv-activity-item">
                      <div className="fv-activity-head">
                        <div className="fv-activity-title">{note.author || 'dashboard'}</div>
                        <span className="fv-activity-time">{formatDateTime(note.created_at)}</span>
                      </div>
                      <div className="fv-row-sub">{note.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {modalMessage && <div className="fv-message">{modalMessage}</div>}

            <div className="fv-actions fv-modal-actions">
              <button className="fv-ghost" type="button" onClick={removeLead} disabled={deleting}>
                {deleting ? 'Excluindo...' : 'Excluir lead'}
              </button>
              <button className="fv-primary" type="button" onClick={saveLead} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
