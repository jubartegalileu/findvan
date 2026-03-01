export const normalizeApiBase = (rawValue) => {
  if (!rawValue) return null;
  try {
    const parsed = new URL(rawValue);
    // Common misconfiguration: pointing API to Vite frontend port.
    if (parsed.port === '5173') {
      parsed.port = '8000';
      return parsed.toString().replace(/\/$/, '');
    }
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return rawValue;
  }
};

export const API_BASE = (() => {
  const envValue = normalizeApiBase(import.meta.env.VITE_API_URL);
  if (envValue) return envValue;

  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:8000`;
  }
  return 'http://localhost:8000';
})();
