import { API_BASE } from './apiBase.js';

const normalizeCampaign = (value) => {
  const name = String(value || '').trim();
  return name || '';
};

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const normalizeStatus = (status) => {
  const value = String(status || '').trim().toLowerCase();
  if (!value) return '';
  if (value === 'sent') return 'queued';
  return value;
};

const parseDate = (value) => {
  const date = new Date(value || '');
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const statusPriority = {
  queued: 1,
  delivered: 2,
  failed: 3,
  replied: 4,
};

const reconciliationSeverity = (localStatus, providerStatus) => {
  if (!localStatus || !providerStatus) return { key: 'warn', label: 'Inconsistência transitória' };
  if (localStatus === providerStatus) return { key: 'ok', label: 'Alinhado' };
  if (providerStatus === 'failed' || (localStatus === 'delivered' && providerStatus === 'queued')) {
    return { key: 'critical', label: 'Inconsistência crítica' };
  }
  return { key: 'warn', label: 'Inconsistência transitória' };
};

const getRisk = (item) => {
  if (item.failed > 0 && (item.sent === 0 || item.failed / Math.max(item.sent, 1) >= 0.2)) {
    return { key: 'high', label: 'Risco alto' };
  }
  if (item.failed > 0 || (item.sent > 0 && item.delivered < item.sent * 0.6)) {
    return { key: 'warn', label: 'Atenção' };
  }
  return { key: 'ok', label: 'Saudável' };
};

const ensureCampaign = (map, name) => {
  if (!map.has(name)) {
    map.set(name, {
      name,
      leads: 0,
      sent: 0,
      delivered: 0,
      replied: 0,
      failed: 0,
    });
  }
  return map.get(name);
};

export const buildReconciliationInsights = ({ leads = [], receipts = [], activity = [] }) => {
  const leadMap = new Map();
  leads.forEach((lead) => {
    const leadId = String(lead?.id || '').trim();
    if (!leadId) return;
    leadMap.set(leadId, {
      id: leadId,
      name: lead?.name || lead?.company_name || `Lead ${leadId}`,
      campaign: normalizeCampaign(lead?.campaign_status) || 'Sem campanha',
    });
  });

  const localByLead = new Map();
  activity.forEach((entry) => {
    const leadId = String(entry?.lead_id || '').trim();
    if (!leadId) return;
    const normalizedStatus = normalizeStatus(entry?.status);
    if (!normalizedStatus) return;
    const at = parseDate(entry?.at);
    const existing = localByLead.get(leadId);
    if (!existing || (at && existing.at && at >= existing.at) || (!existing.at && at)) {
      localByLead.set(leadId, { status: normalizedStatus, at });
    }
  });

  const providerByLead = new Map();
  receipts.forEach((entry) => {
    const leadId = String(entry?.lead_id || '').trim();
    if (!leadId) return;
    const normalizedStatus = normalizeStatus(entry?.event_type);
    if (!normalizedStatus) return;
    const at = parseDate(entry?.occurred_at || entry?.received_at);
    const existing = providerByLead.get(leadId);
    const currentPriority = statusPriority[normalizedStatus] || 0;
    const existingPriority = statusPriority[existing?.status] || 0;
    if (
      !existing ||
      currentPriority > existingPriority ||
      (currentPriority === existingPriority && at && existing.at && at >= existing.at)
    ) {
      providerByLead.set(leadId, { status: normalizedStatus, at });
    }
  });

  const divergences = [];
  const knownLeadIds = new Set([...localByLead.keys(), ...providerByLead.keys()]);
  knownLeadIds.forEach((leadId) => {
    const local = localByLead.get(leadId);
    const provider = providerByLead.get(leadId);
    if (!local || !provider) return;
    if (local.status === provider.status) return;
    const lead = leadMap.get(leadId) || { id: leadId, name: `Lead ${leadId}`, campaign: 'Sem campanha' };
    const severity = reconciliationSeverity(local.status, provider.status);
    divergences.push({
      leadId,
      leadName: lead.name,
      campaign: lead.campaign,
      localStatus: local.status,
      providerStatus: provider.status,
      severity,
      providerAt: provider.at ? provider.at.toISOString() : null,
    });
  });

  divergences.sort((a, b) => {
    const rank = { critical: 2, warn: 1, ok: 0 };
    return (rank[b.severity.key] || 0) - (rank[a.severity.key] || 0);
  });

  return {
    items: divergences,
    totals: {
      total: divergences.length,
      critical: divergences.filter((item) => item.severity.key === 'critical').length,
      warning: divergences.filter((item) => item.severity.key === 'warn').length,
    },
  };
};

export const buildCampaignMonitoring = ({ leads = [], receipts = [], activity = [] }) => {
  const map = new Map();
  const leadCampaignById = new Map();

  leads.forEach((lead) => {
    const campaign = normalizeCampaign(lead?.campaign_status);
    if (!campaign) return;
    const item = ensureCampaign(map, campaign);
    item.leads += 1;
    const leadId = String(lead?.id || '').trim();
    if (leadId) leadCampaignById.set(leadId, campaign);
  });

  activity.forEach((entry) => {
    const leadId = String(entry?.lead_id || '').trim();
    const campaign = leadCampaignById.get(leadId);
    if (!campaign) return;
    const item = ensureCampaign(map, campaign);
    const status = String(entry?.status || '').toLowerCase();
    if (status) item.sent += 1;
    if (status === 'delivered') item.delivered += 1;
    if (status === 'failed') item.failed += 1;
    if (status === 'replied') item.replied += 1;
  });

  receipts.forEach((entry) => {
    const leadId = String(entry?.lead_id || '').trim();
    const campaign = leadCampaignById.get(leadId);
    if (!campaign) return;
    const item = ensureCampaign(map, campaign);
    const eventType = String(entry?.event_type || '').toLowerCase();
    if (eventType === 'delivered') item.delivered += 1;
    if (eventType === 'failed') item.failed += 1;
    if (eventType === 'replied') item.replied += 1;
  });

  const items = Array.from(map.values())
    .map((item) => {
      const risk = getRisk(item);
      return {
        ...item,
        deliveryRate: item.sent > 0 ? Math.round((item.delivered / item.sent) * 100) : 0,
        replyRate: item.sent > 0 ? Math.round((item.replied / item.sent) * 100) : 0,
        risk,
      };
    })
    .sort((a, b) => b.sent - a.sent || b.leads - a.leads || a.name.localeCompare(b.name));

  const totals = items.reduce(
    (acc, item) => ({
      campaigns: acc.campaigns + 1,
      leads: acc.leads + item.leads,
      sent: acc.sent + item.sent,
      delivered: acc.delivered + item.delivered,
      replied: acc.replied + item.replied,
      failed: acc.failed + item.failed,
    }),
    { campaigns: 0, leads: 0, sent: 0, delivered: 0, replied: 0, failed: 0 }
  );

  return {
    items,
    totals,
    reconciliation: buildReconciliationInsights({ leads, receipts, activity }),
  };
};

export const fetchCampaignMonitoringData = async () => {
  const [leadsRes, receiptsRes] = await Promise.allSettled([
    fetch(`${API_BASE}/api/leads/?limit=300`),
    fetch(`${API_BASE}/api/integrations/messaging/receipts?limit=150`),
  ]);

  let leads = [];
  if (leadsRes.status === 'fulfilled') {
    const payload = await leadsRes.value.json().catch(() => ({}));
    if (leadsRes.value.ok && Array.isArray(payload?.leads)) leads = payload.leads;
  }

  let receipts = [];
  if (receiptsRes.status === 'fulfilled') {
    const payload = await receiptsRes.value.json().catch(() => ({}));
    if (receiptsRes.value.ok && Array.isArray(payload?.events)) receipts = payload.events;
  }

  return { leads, receipts };
};

export const mergeMonitoringResult = (base, extra) => ({
  campaigns: toNumber(base?.campaigns) + toNumber(extra?.campaigns),
  leads: toNumber(base?.leads) + toNumber(extra?.leads),
  sent: toNumber(base?.sent) + toNumber(extra?.sent),
  delivered: toNumber(base?.delivered) + toNumber(extra?.delivered),
  replied: toNumber(base?.replied) + toNumber(extra?.replied),
  failed: toNumber(base?.failed) + toNumber(extra?.failed),
});
