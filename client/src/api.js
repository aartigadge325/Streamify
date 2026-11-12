const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
let accessToken = null;
let refreshInFlight;

export function getAccessToken() {
  return accessToken;
}

export function saveTokens(tokens = {}) {
  accessToken = typeof tokens.accessToken === 'string' ? tokens.accessToken : null;
}

export function clearSession() {
  accessToken = null;
}

async function rotateTokens() {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Refresh failed');
      const payload = await response.json();
      saveTokens(payload.data);
      return Boolean(accessToken);
    } catch {
      clearSession();
      window.dispatchEvent(new Event('streamify:session-expired'));
      return false;
    } finally {
      refreshInFlight = undefined;
    }
  })();

  return refreshInFlight;
}

export async function restoreSession() {
  const refreshed = await rotateTokens();
  if (!refreshed) return null;

  try {
    const data = await api('/auth/me', { retry: false });
    return data.user || null;
  } catch {
    clearSession();
    return null;
  }
}

export async function api(path, { method = 'GET', body, auth = true, retry = true } = {}) {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers = { Accept: 'application/json' };
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  const token = auth ? getAccessToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    ...(body === undefined ? {} : { body: isForm ? body : JSON.stringify(body) })
  });

  if (response.status === 401 && auth && retry) {
    const refreshed = await rotateTokens();
    if (refreshed) return api(path, { method, body, auth, retry: false });
  }

  if (response.status === 204) return null;
  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  if (!response.ok || payload.success === false) {
    const error = new Error(payload.message || `Request failed (${response.status})`);
    error.status = response.status;
    error.requestId = payload.requestId;
    throw error;
  }
  return payload.data;
}

