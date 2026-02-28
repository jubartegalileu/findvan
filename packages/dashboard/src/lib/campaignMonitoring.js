import { API_BASE } from './apiBase.js';

const normalizeCampaign = (value) => {
  const name = String(value || '').trim();
  return name || '';
};

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

export const SLO_WINDOWS = [
  { value: '1h', label: 'Última 1h', hours: 1 },
  { value: '24h', label: 'Últimas 24h', hours: 24 },
  { value: '7d', label: 'Últimos 7 dias', hours: 24 * 7 },
];

export const DEFAULT_SLO_THRESHOLDS = {
  delivery_rate_critical_lt: 70,
  delivery_rate_high_lt: 80,
  delivery_rate_medium_lt: 90,
  failure_rate_critical_gte: 20,
  failure_rate_high_gte: 10,
  failure_rate_medium_gte: 5,
  reply_rate_medium_lt: 5,
  latency_critical_gt_min: 120,
  latency_high_gt_min: 60,
  block_rate_critical_gt: 5,
  block_rate_high_gt: 3,
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

const getWindowHours = (window) => {
  const selected = SLO_WINDOWS.find((item) => item.value === window);
  return selected?.hours || 24;
};

const filterByWindow = (rows, window, readDate) => {
  const now = Date.now();
  const minTime = now - getWindowHours(window) * 60 * 60 * 1000;
  return rows.filter((row) => {
    const at = readDate(row);
    return at instanceof Date && !Number.isNaN(at.getTime()) && at.getTime() >= minTime;
  });
};

const filterByRange = (rows, startMs, endMs, readDate) =>
  rows.filter((row) => {
    const at = readDate(row);
    if (!(at instanceof Date) || Number.isNaN(at.getTime())) return false;
    const time = at.getTime();
    return time >= startMs && time < endMs;
  });

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

const calcRelativeCost = ({ sent = 0, delivered = 0, replied = 0, failed = 0 }) =>
  Math.round((sent * 1 + delivered * 0.1 + replied * 0.2 + failed * 0.6) * 100) / 100;

const normalizeThresholds = (thresholds) => ({
  ...DEFAULT_SLO_THRESHOLDS,
  ...(thresholds && typeof thresholds === 'object' ? thresholds : {}),
});

const getSloSeverity = ({ sent, deliveryRate, replyRate, failureRate, latencyAvgMinutes }, thresholds) => {
  const t = normalizeThresholds(thresholds);
  if (sent <= 0) return { key: 'low', label: 'Baixa prioridade' };
  if (failureRate >= t.failure_rate_critical_gte || deliveryRate < t.delivery_rate_critical_lt || latencyAvgMinutes > t.latency_critical_gt_min) {
    return { key: 'critical', label: 'Crítico' };
  }
  if (failureRate >= t.failure_rate_high_gte || deliveryRate < t.delivery_rate_high_lt || latencyAvgMinutes > t.latency_high_gt_min) {
    return { key: 'high', label: 'Alto' };
  }
  if ((sent >= 20 && replyRate < t.reply_rate_medium_lt) || failureRate >= t.failure_rate_medium_gte || deliveryRate < t.delivery_rate_medium_lt) {
    return { key: 'medium', label: 'Médio' };
  }
  return { key: 'low', label: 'Baixa prioridade' };
};

export const buildOperationalSlo = ({ receipts = [], activity = [], window = '24h', thresholds = DEFAULT_SLO_THRESHOLDS }) => {
  const t = normalizeThresholds(thresholds);
  const filteredActivity = filterByWindow(activity, window, (entry) => parseDate(entry?.at));
  const filteredReceipts = filterByWindow(receipts, window, (entry) => parseDate(entry?.occurred_at || entry?.received_at));

  const sent = filteredActivity.length;
  const statusCounts = filteredActivity.reduce(
    (acc, entry) => {
      const status = String(entry?.status || '').toLowerCase();
      if (status === 'delivered') acc.delivered += 1;
      if (status === 'failed') acc.failed += 1;
      if (status === 'replied') acc.replied += 1;
      return acc;
    },
    { delivered: 0, replied: 0, failed: 0 }
  );

  const receiptCounts = filteredReceipts.reduce(
    (acc, entry) => {
      const type = String(entry?.event_type || '').toLowerCase();
      if (type === 'delivered') acc.delivered += 1;
      if (type === 'failed') acc.failed += 1;
      if (type === 'replied') acc.replied += 1;
      return acc;
    },
    { delivered: 0, replied: 0, failed: 0 }
  );

  const delivered = statusCounts.delivered + receiptCounts.delivered;
  const replied = statusCounts.replied + receiptCounts.replied;
  const failed = statusCounts.failed + receiptCounts.failed;
  const deliveryRate = sent > 0 ? Math.round((delivered / sent) * 100) : 0;
  const replyRate = sent > 0 ? Math.round((replied / sent) * 100) : 0;
  const failureRate = sent > 0 ? Math.round((failed / sent) * 100) : 0;

  const sendByLead = new Map();
  filteredActivity.forEach((entry) => {
    const leadId = String(entry?.lead_id || '').trim();
    const at = parseDate(entry?.at);
    if (!leadId || !at) return;
    if (!sendByLead.has(leadId)) sendByLead.set(leadId, []);
    sendByLead.get(leadId).push(at);
  });
  sendByLead.forEach((values) => values.sort((a, b) => a.getTime() - b.getTime()));

  let latencySamples = 0;
  let latencySumMinutes = 0;
  filteredReceipts.forEach((entry) => {
    const leadId = String(entry?.lead_id || '').trim();
    const receivedAt = parseDate(entry?.occurred_at || entry?.received_at);
    if (!leadId || !receivedAt) return;
    const sentTimes = sendByLead.get(leadId);
    if (!Array.isArray(sentTimes) || sentTimes.length === 0) return;
    let matched = null;
    for (let index = sentTimes.length - 1; index >= 0; index -= 1) {
      if (sentTimes[index].getTime() <= receivedAt.getTime()) {
        matched = sentTimes[index];
        break;
      }
    }
    if (!matched) return;
    const diffMinutes = (receivedAt.getTime() - matched.getTime()) / 60000;
    if (diffMinutes < 0 || diffMinutes > 60 * 24) return;
    latencySamples += 1;
    latencySumMinutes += diffMinutes;
  });

  const latencyAvgMinutes = latencySamples > 0 ? Math.round((latencySumMinutes / latencySamples) * 10) / 10 : 0;
  const severity = getSloSeverity({ sent, deliveryRate, replyRate, failureRate, latencyAvgMinutes }, t);
  const alerts = [];

  if (sent > 0) {
    if (failureRate >= t.failure_rate_critical_gte) alerts.push({ key: 'critical', message: `Taxa de falha alta (${failureRate}%).` });
    if (deliveryRate < t.delivery_rate_high_lt) alerts.push({ key: 'high', message: `Taxa de entrega baixa (${deliveryRate}%).` });
    if (latencyAvgMinutes > t.latency_high_gt_min) alerts.push({ key: 'high', message: `Latência média elevada (${latencyAvgMinutes} min).` });
    if (replyRate < t.reply_rate_medium_lt && sent >= 20) alerts.push({ key: 'medium', message: `Taxa de resposta baixa (${replyRate}%).` });
  }

  alerts.sort((a, b) => {
    const rank = { critical: 4, high: 3, medium: 2, low: 1 };
    return (rank[b.key] || 0) - (rank[a.key] || 0);
  });

  return {
    window,
    hasData: sent > 0 || filteredReceipts.length > 0,
    sent,
    delivered,
    replied,
    failed,
    deliveryRate,
    replyRate,
    failureRate,
    latencyAvgMinutes,
    severity,
    alerts,
  };
};

export const buildCostThroughputInsights = ({ leads = [], receipts = [], activity = [], window = '24h' }) => {
  const now = Date.now();
  const windowMs = getWindowHours(window) * 60 * 60 * 1000;
  const currentStart = now - windowMs;
  const previousStart = currentStart - windowMs;

  const readActivityDate = (entry) => parseDate(entry?.at);
  const readReceiptDate = (entry) => parseDate(entry?.occurred_at || entry?.received_at);

  const currentActivity = filterByRange(activity, currentStart, now, readActivityDate);
  const previousActivity = filterByRange(activity, previousStart, currentStart, readActivityDate);
  const currentReceipts = filterByRange(receipts, currentStart, now, readReceiptDate);
  const previousReceipts = filterByRange(receipts, previousStart, currentStart, readReceiptDate);

  const aggregate = (activityRows, receiptRows) => {
    const sent = activityRows.length;
    const statuses = activityRows.reduce(
      (acc, entry) => {
        const status = String(entry?.status || '').toLowerCase();
        if (status === 'delivered') acc.delivered += 1;
        if (status === 'failed') acc.failed += 1;
        if (status === 'replied') acc.replied += 1;
        return acc;
      },
      { delivered: 0, replied: 0, failed: 0 }
    );
    const receiptStatuses = receiptRows.reduce(
      (acc, entry) => {
        const type = String(entry?.event_type || '').toLowerCase();
        if (type === 'delivered') acc.delivered += 1;
        if (type === 'failed') acc.failed += 1;
        if (type === 'replied') acc.replied += 1;
        return acc;
      },
      { delivered: 0, replied: 0, failed: 0 }
    );

    const delivered = statuses.delivered + receiptStatuses.delivered;
    const replied = statuses.replied + receiptStatuses.replied;
    const failed = statuses.failed + receiptStatuses.failed;
    const processed = sent + delivered + replied + failed;
    const relativeCost = calcRelativeCost({ sent, delivered, replied, failed });
    const efficiency = sent > 0 ? Math.round((replied / sent) * 100) : 0;
    return { sent, delivered, replied, failed, processed, relativeCost, efficiency };
  };

  const current = aggregate(currentActivity, currentReceipts);
  const previous = aggregate(previousActivity, previousReceipts);
  const trend = {
    sentDelta: current.sent - previous.sent,
    costDelta: Math.round((current.relativeCost - previous.relativeCost) * 100) / 100,
    efficiencyDelta: current.efficiency - previous.efficiency,
  };

  const leadCampaignById = new Map();
  leads.forEach((lead) => {
    const leadId = String(lead?.id || '').trim();
    const campaign = normalizeCampaign(lead?.campaign_status);
    if (leadId && campaign) leadCampaignById.set(leadId, campaign);
  });

  const campaignMap = new Map();
  const ensureCampaignCost = (name) => {
    if (!campaignMap.has(name)) {
      campaignMap.set(name, { campaign: name, sent: 0, delivered: 0, replied: 0, failed: 0, relativeCost: 0 });
    }
    return campaignMap.get(name);
  };

  currentActivity.forEach((entry) => {
    const leadId = String(entry?.lead_id || '').trim();
    const campaign = leadCampaignById.get(leadId);
    if (!campaign) return;
    const item = ensureCampaignCost(campaign);
    item.sent += 1;
    const status = String(entry?.status || '').toLowerCase();
    if (status === 'delivered') item.delivered += 1;
    if (status === 'failed') item.failed += 1;
    if (status === 'replied') item.replied += 1;
  });

  currentReceipts.forEach((entry) => {
    const leadId = String(entry?.lead_id || '').trim();
    const campaign = leadCampaignById.get(leadId);
    if (!campaign) return;
    const item = ensureCampaignCost(campaign);
    const type = String(entry?.event_type || '').toLowerCase();
    if (type === 'delivered') item.delivered += 1;
    if (type === 'failed') item.failed += 1;
    if (type === 'replied') item.replied += 1;
  });

  const byCampaign = Array.from(campaignMap.values())
    .map((item) => ({
      ...item,
      relativeCost: calcRelativeCost(item),
      efficiency: item.sent > 0 ? Math.round((item.replied / item.sent) * 100) : 0,
    }))
    .sort((a, b) => b.relativeCost - a.relativeCost || b.sent - a.sent);

  return {
    window,
    hasData: current.processed > 0,
    current,
    previous,
    trend,
    byCampaign: byCampaign.slice(0, 5),
  };
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

export const buildCampaignMonitoring = ({
  leads = [],
  receipts = [],
  activity = [],
  window = '24h',
  thresholds = DEFAULT_SLO_THRESHOLDS,
}) => {
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
    slo: buildOperationalSlo({ receipts, activity, window, thresholds }),
    cost: buildCostThroughputInsights({ leads, receipts, activity, window }),
  };
};

export const fetchGovernanceThresholds = async () => {
  const response = await fetch(`${API_BASE}/api/dashboard/metrics-governance`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.thresholds) return { ...DEFAULT_SLO_THRESHOLDS };
  return normalizeThresholds(payload.thresholds);
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
