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
const batchTemplates = [
  {
    id: 'followup-24h',
    label: 'Follow-up 24h',
    nextActionDescription: 'Retornar contato em 24h',
    cadenceDays: '1',
    note: 'Follow-up agendado para 24h',
  },
  {
    id: 'proposta',
    label: 'Enviar proposta',
    nextActionDescription: 'Enviar proposta personalizada',
    cadenceDays: '2',
    note: 'Preparar proposta com detalhes do servico',
  },
  {
    id: 'qualificar',
    label: 'Qualificar lead',
    nextActionDescription: 'Validar interesse e faixa de horario',
    cadenceDays: '1',
    note: 'Executar roteiro de qualificacao SDR',
  },
];

const formatDateTime = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('pt-BR');
};

const batchErrorMessage = (detail, fallback) => (detail ? `Operacao em lote falhou: ${detail}` : fallback);
const normalizeTeamOwnerSlug = (value) => {
  const raw = (value || '').trim().toLowerCase();
  const slug = raw.replace(/[^a-z0-9_-]+/g, '-').replace(/^[-_]+|[-_]+$/g, '');
  return slug || 'default';
};
const templatePermissionDeniedMessage = 'Acesso negado para operar template neste escopo.';

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
  const [customBatchTemplates, setCustomBatchTemplates] = useState([]);
  const [templateOwnerScope, setTemplateOwnerScope] = useState('seller');
  const [templateTeamName, setTemplateTeamName] = useState('default');
  const [templateActorInput, setTemplateActorInput] = useState('');
  const [batchTemplateNameDraft, setBatchTemplateNameDraft] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [batchAssignDraft, setBatchAssignDraft] = useState('');
  const [batchNoteDraft, setBatchNoteDraft] = useState('');
  const [batchNextActionDescription, setBatchNextActionDescription] = useState('');
  const [batchNextActionDate, setBatchNextActionDate] = useState('');
  const [batchCadenceDays, setBatchCadenceDays] = useState('1');
  const [batchFeedback, setBatchFeedback] = useState('');
  const [templateAuditEvents, setTemplateAuditEvents] = useState([]);
  const [templateAuditLoading, setTemplateAuditLoading] = useState(false);
  const [templateAuditError, setTemplateAuditError] = useState('');
  const [templatePermission, setTemplatePermission] = useState({ allowed: false, reason: 'Carregando...' });
  const [templatePermissionLoading, setTemplatePermissionLoading] = useState(true);

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

  const templateOwner = useMemo(() => {
    if (templateOwnerScope === 'global') return 'all';
    if (templateOwnerScope === 'team') {
      return `team:${normalizeTeamOwnerSlug(templateTeamName)}`;
    }
    return sellerFilter || 'all';
  }, [templateOwnerScope, templateTeamName, sellerFilter]);
  const templateActor = useMemo(() => {
    const typed = (templateActorInput || '').trim();
    if (typed) return typed;
    if (templateOwner === 'all') return '';
    return templateOwner;
  }, [templateActorInput, templateOwner]);
  const templateMutationDisabled = templatePermissionLoading || !templatePermission.allowed;

  const loadCustomTemplates = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('owner', templateOwner);
      const response = await fetch(`${API_BASE}/api/sdr/templates?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.detail || 'Falha ao carregar templates.');
      }
      const list = Array.isArray(payload?.templates) ? payload.templates : [];
      const normalized = list
        .map((item) => ({
          id: `custom-${item.id}`,
          templateId: Number(item.id),
          label: String(item.name || '').trim(),
          nextActionDescription: String(item.next_action_description || '').trim(),
          cadenceDays: String(item.cadence_days || '1'),
          note: String(item.note || '').trim(),
          isFavorite: Boolean(item.is_favorite),
          sortOrder: Number(item.sort_order || 0),
          isCustom: true,
        }))
        .filter((item) => item.label);
      setCustomBatchTemplates(normalized);
    } catch (err) {
      setError(err.message || 'Falha ao carregar templates.');
      setCustomBatchTemplates([]);
    }
  }, [templateOwner]);

  const loadTemplatePermission = useCallback(async () => {
    setTemplatePermissionLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('owner', templateOwner);
      if (templateActor) {
        params.set('actor', templateActor);
      }
      const response = await fetch(`${API_BASE}/api/sdr/templates/permission?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.detail || 'Falha ao validar permissao de template.');
      }
      setTemplatePermission({
        allowed: Boolean(payload?.allowed),
        reason: String(payload?.reason || ''),
      });
    } catch (err) {
      setTemplatePermission({ allowed: false, reason: err.message || 'Falha ao validar permissao de template.' });
    } finally {
      setTemplatePermissionLoading(false);
    }
  }, [templateOwner, templateActor]);

  useEffect(() => {
    loadCustomTemplates();
  }, [loadCustomTemplates]);

  useEffect(() => {
    loadTemplatePermission();
  }, [loadTemplatePermission]);

  useEffect(() => {
    setSelectedTemplateId('');
  }, [templateOwner]);

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
    const requestedLeadIds = [...selectedLeadIds];

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
        throw new Error(batchErrorMessage(payload?.detail, 'Operacao em lote falhou ao atribuir leads.'));
      }
      const updatedIds = Array.isArray(payload?.lead_ids)
        ? payload.lead_ids.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0)
        : [];
      const updatedSet = new Set(updatedIds);
      const updatedCount = Number(payload?.updated_count ?? updatedIds.length ?? 0);
      const remainingSelected = requestedLeadIds.filter((leadId) => !updatedSet.has(leadId));
      setBatchAssignDraft('');
      setSelectedLeadIds(remainingSelected);
      if (updatedCount === requestedLeadIds.length) {
        setBatchFeedback(`${updatedCount} lead(s) atribuido(s) com sucesso.`);
      } else {
        setBatchFeedback(
          `${updatedCount} de ${requestedLeadIds.length} lead(s) atribuido(s) com sucesso. ${remainingSelected.length} permanece(m) selecionado(s).`
        );
      }
      await Promise.all([loadQueue(), loadStats()]);
    } catch (err) {
      setError(err.message || 'Operacao em lote falhou ao atribuir leads.');
    } finally {
      setBusyLeadId(null);
    }
  };

  const patchActionBatchDone = async () => {
    if (selectedLeadIds.length === 0) return;
    const requestedLeadIds = [...selectedLeadIds];

    setBusyLeadId('batch');
    setError('');
    setBatchFeedback('');
    try {
      const response = await fetch(`${API_BASE}/api/sdr/action/batch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_ids: selectedLeadIds, action_type: 'done', author: 'sdr-ui' }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(batchErrorMessage(payload?.detail, 'Operacao em lote falhou ao marcar lote como feito.'));
      }
      const updatedIds = Array.isArray(payload?.lead_ids)
        ? payload.lead_ids.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0)
        : [];
      const updatedSet = new Set(updatedIds);
      const updatedCount = Number(payload?.updated_count ?? updatedIds.length ?? 0);
      const remainingSelected = requestedLeadIds.filter((leadId) => !updatedSet.has(leadId));
      setSelectedLeadIds(remainingSelected);
      if (updatedCount === requestedLeadIds.length) {
        setBatchFeedback(`${updatedCount} lead(s) marcado(s) como feito.`);
      } else {
        setBatchFeedback(
          `${updatedCount} de ${requestedLeadIds.length} lead(s) marcado(s) como feito. ${remainingSelected.length} permanece(m) selecionado(s).`
        );
      }
      await Promise.all([loadQueue(), loadStats()]);
    } catch (err) {
      setError(err.message || 'Operacao em lote falhou ao marcar lote como feito.');
    } finally {
      setBusyLeadId(null);
    }
  };

  const patchActionBatchSchedule = async () => {
    if (selectedLeadIds.length === 0) return;
    const requestedLeadIds = [...selectedLeadIds];
    const nextActionDescription = batchNextActionDescription.trim();
    if (!nextActionDescription) return;

    setBusyLeadId('batch');
    setError('');
    setBatchFeedback('');
    try {
      const response = await fetch(`${API_BASE}/api/sdr/action/batch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_ids: selectedLeadIds,
          action_type: 'scheduled',
          author: 'sdr-ui',
          next_action_description: nextActionDescription,
          next_action_date: batchNextActionDate || null,
          cadence_days: Number(batchCadenceDays || 1),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(batchErrorMessage(payload?.detail, 'Operacao em lote falhou ao agendar proxima acao.'));
      }
      const updatedIds = Array.isArray(payload?.lead_ids)
        ? payload.lead_ids.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0)
        : [];
      const updatedSet = new Set(updatedIds);
      const updatedCount = Number(payload?.updated_count ?? updatedIds.length ?? 0);
      const remainingSelected = requestedLeadIds.filter((leadId) => !updatedSet.has(leadId));
      setSelectedLeadIds(remainingSelected);
      if (updatedCount === requestedLeadIds.length) {
        setBatchFeedback(`${updatedCount} lead(s) com proxima acao agendada.`);
      } else {
        setBatchFeedback(
          `${updatedCount} de ${requestedLeadIds.length} lead(s) com proxima acao agendada. ${remainingSelected.length} permanece(m) selecionado(s).`
        );
      }
      setBatchNextActionDescription('');
      setBatchNextActionDate('');
      await Promise.all([loadQueue(), loadStats()]);
    } catch (err) {
      setError(err.message || 'Operacao em lote falhou ao agendar proxima acao.');
    } finally {
      setBusyLeadId(null);
    }
  };

  const patchNoteBatch = async () => {
    if (selectedLeadIds.length === 0) return;
    const requestedLeadIds = [...selectedLeadIds];
    const note = batchNoteDraft.trim();
    if (!note) return;

    setBusyLeadId('batch');
    setError('');
    setBatchFeedback('');
    try {
      const response = await fetch(`${API_BASE}/api/sdr/notes/batch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_ids: selectedLeadIds,
          note,
          author: 'sdr-ui',
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(batchErrorMessage(payload?.detail, 'Operacao em lote falhou ao adicionar nota.'));
      }
      const updatedIds = Array.isArray(payload?.lead_ids)
        ? payload.lead_ids.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0)
        : [];
      const updatedSet = new Set(updatedIds);
      const updatedCount = Number(payload?.updated_count ?? updatedIds.length ?? 0);
      const remainingSelected = requestedLeadIds.filter((leadId) => !updatedSet.has(leadId));
      setSelectedLeadIds(remainingSelected);
      setBatchNoteDraft('');
      if (updatedCount === requestedLeadIds.length) {
        setBatchFeedback(`${updatedCount} lead(s) com nota registrada em lote.`);
      } else {
        setBatchFeedback(
          `${updatedCount} de ${requestedLeadIds.length} lead(s) com nota registrada em lote. ${remainingSelected.length} permanece(m) selecionado(s).`
        );
      }
      await Promise.all([loadQueue(), loadStats()]);
    } catch (err) {
      setError(err.message || 'Operacao em lote falhou ao adicionar nota.');
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
  const availableTemplates = useMemo(
    () => [...batchTemplates, ...customBatchTemplates],
    [customBatchTemplates]
  );
  const selectedCustomTemplate = useMemo(
    () => customBatchTemplates.find((item) => item.id === selectedTemplateId) || null,
    [customBatchTemplates, selectedTemplateId]
  );

  const loadTemplateAudit = useCallback(async () => {
    if (!selectedCustomTemplate?.templateId) {
      setTemplateAuditEvents([]);
      setTemplateAuditError('');
      return;
    }
    setTemplateAuditLoading(true);
    setTemplateAuditError('');
    try {
      const params = new URLSearchParams();
      params.set('owner', templateOwner);
      params.set('template_id', String(selectedCustomTemplate.templateId));
      params.set('limit', '20');
      const response = await fetch(`${API_BASE}/api/sdr/templates/audit?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.detail || 'Falha ao carregar auditoria do template.');
      }
      const events = Array.isArray(payload?.events) ? payload.events : [];
      setTemplateAuditEvents(events);
    } catch (err) {
      setTemplateAuditEvents([]);
      setTemplateAuditError(err.message || 'Falha ao carregar auditoria do template.');
    } finally {
      setTemplateAuditLoading(false);
    }
  }, [selectedCustomTemplate, templateOwner]);

  useEffect(() => {
    loadTemplateAudit();
  }, [loadTemplateAudit]);

  const applyBatchTemplate = (templateId) => {
    const template = availableTemplates.find((item) => item.id === templateId);
    if (!template) return;
    setBatchNextActionDescription(template.nextActionDescription);
    setBatchCadenceDays(template.cadenceDays);
    setBatchNoteDraft(template.note);
    setBatchFeedback(`Template aplicado: ${template.label}.`);
  };

  const saveCurrentAsTemplate = async () => {
    if (templateMutationDisabled) {
      setError(templatePermission.reason || templatePermissionDeniedMessage);
      return;
    }
    const label = batchTemplateNameDraft.trim();
    if (!label) return;
    const nextActionDescription = batchNextActionDescription.trim();
    const note = batchNoteDraft.trim();
    if (!nextActionDescription && !note) return;

    try {
      const response = await fetch(`${API_BASE}/api/sdr/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: templateOwner,
          actor: templateActor || undefined,
          name: label,
          next_action_description: nextActionDescription || null,
          cadence_days: Number(batchCadenceDays || 1),
          note: note || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(templatePermissionDeniedMessage);
        }
        throw new Error(payload?.detail || 'Falha ao salvar template.');
      }
      await loadCustomTemplates();
      setBatchTemplateNameDraft('');
      if (payload?.template?.id) {
        setSelectedTemplateId(`custom-${payload.template.id}`);
      }
      setBatchFeedback(`Template salvo no escopo: ${templateOwner}.`);
    } catch (err) {
      setError(err.message || 'Falha ao salvar template.');
    }
  };

  const deleteSelectedCustomTemplate = async () => {
    if (templateMutationDisabled) {
      setError(templatePermission.reason || templatePermissionDeniedMessage);
      return;
    }
    if (!selectedTemplateId) return;
    const current = availableTemplates.find((item) => item.id === selectedTemplateId);
    if (!current || !current.isCustom) {
      setBatchFeedback('Apenas templates custom podem ser excluidos.');
      return;
    }
    try {
      const response = await fetch(
        `${API_BASE}/api/sdr/templates/${current.templateId}?owner=${encodeURIComponent(templateOwner)}${
          templateActor ? `&actor=${encodeURIComponent(templateActor)}` : ''
        }`,
        { method: 'DELETE' }
      );
      const payload = await response.json();
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(templatePermissionDeniedMessage);
        }
        throw new Error(payload?.detail || 'Falha ao excluir template.');
      }
      await loadCustomTemplates();
      setSelectedTemplateId('');
      setBatchFeedback(`Template removido: ${current.label}.`);
    } catch (err) {
      setError(err.message || 'Falha ao excluir template.');
    }
  };

  const patchTemplatePreferences = async (templateId, payload) => {
    const response = await fetch(`${API_BASE}/api/sdr/templates/${templateId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner: templateOwner, actor: templateActor || undefined, ...payload }),
    });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error(templatePermissionDeniedMessage);
      }
      throw new Error(data?.detail || 'Falha ao atualizar template.');
    }
    return data?.template;
  };

  const toggleSelectedTemplateFavorite = async () => {
    if (templateMutationDisabled) {
      setError(templatePermission.reason || templatePermissionDeniedMessage);
      return;
    }
    if (!selectedTemplateId) return;
    const current = customBatchTemplates.find((item) => item.id === selectedTemplateId);
    if (!current) {
      setBatchFeedback('Apenas templates custom podem ser favoritados.');
      return;
    }
    try {
      await patchTemplatePreferences(current.templateId, { is_favorite: !current.isFavorite });
      await loadCustomTemplates();
      setBatchFeedback(`Template atualizado: ${current.label}.`);
    } catch (err) {
      setError(err.message || 'Falha ao atualizar template.');
    }
  };

  const moveSelectedTemplate = async (direction) => {
    if (templateMutationDisabled) {
      setError(templatePermission.reason || templatePermissionDeniedMessage);
      return;
    }
    if (!selectedTemplateId) return;
    const currentIndex = customBatchTemplates.findIndex((item) => item.id === selectedTemplateId);
    if (currentIndex < 0) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= customBatchTemplates.length) return;

    const current = customBatchTemplates[currentIndex];
    const target = customBatchTemplates[targetIndex];
    const currentOrder = Number.isFinite(current.sortOrder) ? current.sortOrder : currentIndex + 1;
    const targetOrder = Number.isFinite(target.sortOrder) ? target.sortOrder : targetIndex + 1;

    try {
      await patchTemplatePreferences(current.templateId, { sort_order: targetOrder });
      await patchTemplatePreferences(target.templateId, { sort_order: currentOrder });
      await loadCustomTemplates();
      setBatchFeedback(`Ordem atualizada: ${current.label}.`);
    } catch (err) {
      setError(err.message || 'Falha ao reordenar template.');
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
            <button
              className="fv-ghost"
              type="button"
              disabled={busyLeadId === 'batch' || selectedLeadIds.length === 0}
              onClick={patchActionBatchDone}
            >
              {busyLeadId === 'batch' ? 'Salvando...' : 'Marcar lote como feito'}
            </button>
          </div>
        </div>
        <div className="fv-row" style={{ marginBottom: 10, gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className="fv-field fv-field-inline">
            <span>Escopo templates</span>
            <select
              className="fv-input fv-select"
              aria-label="Escopo templates"
              value={templateOwnerScope}
              onChange={(e) => setTemplateOwnerScope(e.target.value)}
            >
              <option value="seller">Vendedor atual</option>
              <option value="team">Equipe</option>
              <option value="global">Global</option>
            </select>
          </label>
          {templateOwnerScope === 'team' && (
            <label className="fv-field fv-field-inline">
              <span>Equipe</span>
              <input
                className="fv-input"
                aria-label="Nome equipe"
                placeholder="default"
                value={templateTeamName}
                onChange={(e) => setTemplateTeamName(e.target.value)}
              />
            </label>
          )}
          <label className="fv-field fv-field-inline">
            <span>Ator template</span>
            <input
              className="fv-input"
              aria-label="Ator template"
              placeholder={templateOwner === 'all' ? 'admin' : templateOwner}
              value={templateActorInput}
              onChange={(e) => setTemplateActorInput(e.target.value)}
            />
          </label>
          <label className="fv-field fv-field-inline">
            <span>Template rapido</span>
            <select
              className="fv-input fv-select"
              aria-label="Template rapido"
              value={selectedTemplateId}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedTemplateId(value);
                if (!value) return;
                applyBatchTemplate(value);
              }}
            >
              <option value="">Selecionar template</option>
              {availableTemplates.map((template) => (
                <option key={template.id} value={template.id}>{template.label}</option>
              ))}
            </select>
          </label>
          <label className="fv-field fv-field-inline">
            <span>Salvar como template</span>
            <input
              className="fv-input"
              aria-label="Nome template"
              placeholder="Nome do template"
              value={batchTemplateNameDraft}
              onChange={(e) => setBatchTemplateNameDraft(e.target.value)}
            />
          </label>
          <button
            className="fv-ghost"
            type="button"
            disabled={
              templateMutationDisabled ||
              !batchTemplateNameDraft.trim() ||
              (!batchNextActionDescription.trim() && !batchNoteDraft.trim())
            }
            onClick={saveCurrentAsTemplate}
          >
            Salvar template
          </button>
          <button
            className="fv-ghost"
            type="button"
            disabled={templateMutationDisabled || !selectedTemplateId}
            onClick={deleteSelectedCustomTemplate}
          >
            Excluir template
          </button>
          <button
            className="fv-ghost"
            type="button"
            disabled={templateMutationDisabled || !selectedTemplateId}
            onClick={toggleSelectedTemplateFavorite}
          >
            Favoritar
          </button>
          <button
            className="fv-ghost"
            type="button"
            disabled={templateMutationDisabled || !selectedTemplateId}
            onClick={() => moveSelectedTemplate('up')}
          >
            Subir
          </button>
          <button
            className="fv-ghost"
            type="button"
            disabled={templateMutationDisabled || !selectedTemplateId}
            onClick={() => moveSelectedTemplate('down')}
          >
            Descer
          </button>
          <label className="fv-field fv-field-inline">
            <span>Nota (lote)</span>
            <input
              className="fv-input"
              placeholder="Ex.: confirmar interesse e horario"
              value={batchNoteDraft}
              onChange={(e) => setBatchNoteDraft(e.target.value)}
            />
          </label>
          <button
            className="fv-ghost"
            type="button"
            disabled={busyLeadId === 'batch' || selectedLeadIds.length === 0 || !batchNoteDraft.trim()}
            onClick={patchNoteBatch}
          >
            {busyLeadId === 'batch' ? 'Salvando...' : 'Adicionar nota em lote'}
          </button>
          <label className="fv-field fv-field-inline">
            <span>Proxima acao (lote)</span>
            <input
              className="fv-input"
              placeholder="Ex.: ligar amanha"
              value={batchNextActionDescription}
              onChange={(e) => setBatchNextActionDescription(e.target.value)}
            />
          </label>
          <label className="fv-field fv-field-inline">
            <span>Data/hora</span>
            <input
              className="fv-input"
              type="datetime-local"
              value={batchNextActionDate}
              onChange={(e) => setBatchNextActionDate(e.target.value)}
            />
          </label>
          <label className="fv-field fv-field-inline">
            <span>Cadencia (dias)</span>
            <input
              className="fv-input fv-input-number"
              type="number"
              min="1"
              max="30"
              value={batchCadenceDays}
              onChange={(e) => setBatchCadenceDays(e.target.value)}
            />
          </label>
          <button
            className="fv-ghost"
            type="button"
            disabled={busyLeadId === 'batch' || selectedLeadIds.length === 0 || !batchNextActionDescription.trim()}
            onClick={patchActionBatchSchedule}
          >
            {busyLeadId === 'batch' ? 'Salvando...' : 'Agendar proxima acao em lote'}
          </button>
        </div>
        <div className="fv-row-sub" style={{ marginBottom: 10 }}>
          Owner efetivo de templates: {templateOwner}
        </div>
        <div className="fv-row-sub" style={{ marginBottom: 10 }}>
          Ator efetivo de templates: {templateActor || '(ausente)'}
        </div>
        <div className="fv-row-sub" style={{ marginBottom: 10 }}>
          Permissao de mutacao: {templatePermissionLoading ? 'carregando...' : templatePermission.allowed ? 'Permitido' : 'Bloqueado'}
        </div>
        {!templatePermissionLoading && !templatePermission.allowed && (
          <div className="fv-row-sub" style={{ marginBottom: 10 }}>
            Motivo: {templatePermission.reason || 'Acesso negado.'}
          </div>
        )}
        {templateOwner === 'all' && templateActor.toLowerCase() !== 'admin' && (
          <div className="fv-row-sub" style={{ marginBottom: 10 }}>
            Escopo global requer ator `admin` para mutacoes de template.
          </div>
        )}
        {selectedLeadIds.length === 0 && <div className="fv-row-sub" style={{ marginBottom: 10 }}>Selecione ao menos 1 lead para habilitar ações em lote.</div>}
        {batchFeedback && <div className="fv-feedback-banner" style={{ marginBottom: 10 }}>{batchFeedback}</div>}
        {selectedCustomTemplate && (
          <div className="fv-panel fv-panel-compact" style={{ marginBottom: 10 }}>
            <div className="fv-panel-header" style={{ marginBottom: 8 }}>
              <h2 style={{ fontSize: 14 }}>Auditoria do template: {selectedCustomTemplate.label}</h2>
            </div>
            {templateAuditLoading ? (
              <div className="fv-row-sub">Carregando auditoria...</div>
            ) : templateAuditError ? (
              <div className="fv-row-sub">{templateAuditError}</div>
            ) : templateAuditEvents.length === 0 ? (
              <div className="fv-row-sub">Sem eventos de auditoria para este template.</div>
            ) : (
              <div className="fv-table">
                {templateAuditEvents.map((event) => (
                  <div key={`audit-${event.id}`} className="fv-row">
                    <div className="fv-row-main">
                      <div className="fv-row-title">{String(event.action || 'unknown')}</div>
                      <div className="fv-row-sub">
                        actor: {String(event.actor || 'system')} • {formatDateTime(event.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
