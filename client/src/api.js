const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
const ACCESS_KEY = 'streamify.access';
const REFRESH_KEY = 'streamify.refresh';
let refreshInFlight;

export function getAccessToken() {
  return sessionStorage.getItem(ACCESS_KEY);
}

export function saveTokens(tokens = {}) {
  if (tokens.accessToken) sessionStorage.setItem(ACCESS_KEY, tokens.accessToken);
  if (tokens.refreshToken) sessionStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}

export function clearSession() {
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
}

async function rotateTokens() {
  if (refreshInFlight) return refreshInFlight;
  const refreshToken = sessionStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return false;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      if (!response.ok) throw new Error('Refresh failed');
      const payload = await response.json();
      saveTokens(payload.data);
      return true;
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

export async function api(path, { method = 'GET', body, auth = true, retry = true } = {}) {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers = { Accept: 'application/json' };
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  const accessToken = auth ? getAccessToken() : null;
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
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
