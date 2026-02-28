const MESSAGING_ACTIVITY_KEY = 'findvan.messaging.activity.v1';
const MAX_ACTIVITY_ITEMS = 30;

export const readMessagingActivity = () => {
  try {
    const raw = localStorage.getItem(MESSAGING_ACTIVITY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const writeMessagingActivity = (items) => {
  try {
    const next = Array.isArray(items) ? items.slice(0, MAX_ACTIVITY_ITEMS) : [];
    localStorage.setItem(MESSAGING_ACTIVITY_KEY, JSON.stringify(next));
    localStorage.setItem('findvan.messaging.activity.lastUpdate', String(Date.now()));
    window.dispatchEvent(new CustomEvent('findvan:messaging-activity-updated'));
  } catch {
    // no-op
  }
};

export const addMessagingActivity = (entry) => {
  const now = new Date().toISOString();
  const current = readMessagingActivity();
  const normalized = {
    id: `msg-${Date.now()}`,
    at: now,
    lead_id: entry?.lead_id || '',
    to: entry?.to || '',
    provider: entry?.provider || 'noop',
    mode: entry?.mode || 'dry_run',
    status: entry?.status || 'queued',
    message: entry?.message || '',
    error: entry?.error || null,
  };
  writeMessagingActivity([normalized, ...current]);
  return normalized;
};

export const clearMessagingActivity = () => {
  writeMessagingActivity([]);
};
