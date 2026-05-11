/**
 * api.js — Central HTTP layer for Sanaa Platform
 *
 * Responsibilities:
 *  - Attach Authorization: Bearer <token> to every request
 *  - On 401: silently refresh the access token, then retry
 *  - On refresh failure: wipe auth data and redirect to login
 *  - Queue concurrent 401s so only ONE refresh call is made
 */

export const API_BASE_URL = 'https://localhost:7101';

// ── Refresh-queue state ──────────────────────────────────────────────────────
let isRefreshing = false;
let refreshQueue = []; // Array of { resolve, reject }

function enqueueRequest(resolve, reject) {
  refreshQueue.push({ resolve, reject });
}

function flushQueue(newToken) {
  refreshQueue.forEach(({ resolve }) => resolve(newToken));
  refreshQueue = [];
}

function rejectQueue(error) {
  refreshQueue.forEach(({ reject }) => reject(error));
  refreshQueue = [];
}

// ── Token helpers ────────────────────────────────────────────────────────────
function getAccessToken() {
  return localStorage.getItem('accessToken');
}

function buildHeaders(isMultipart = false) {
  const headers = {};
  if (!isMultipart) headers['Content-Type'] = 'application/json';
  const token = getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// ── Internal refresh call (bypasses apiFetch to avoid infinite loops) ────────
async function callRefreshEndpoint() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) throw new Error('No refresh token stored');

  const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) throw new Error('Refresh token expired or invalid');

  const data = await res.json();
  const newAccessToken = data.accessToken ?? data.token ?? '';
  localStorage.setItem('accessToken',  newAccessToken);
  localStorage.setItem('refreshToken', data.refreshToken ?? '');
  return newAccessToken;
}

// ── Auth wipe + redirect ─────────────────────────────────────────────────────
function clearAuthAndRedirect() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('currentUser');

  if (!window.location.pathname.toLowerCase().endsWith('login.html')) {
    window.location.href = 'Login.html';
  }
}

// ── Core fetch wrapper ───────────────────────────────────────────────────────
/**
 * apiFetch(endpoint, options)
 *
 * @param {string} endpoint  - Relative path (e.g. '/api/Users') or absolute URL
 * @param {object} options   - Standard fetch options + optional `isMultipart: true`
 * @returns {Promise<Response>}
 *
 * Throws on network errors or when refresh fails (auth is cleared first).
 */
export async function apiFetch(endpoint, options = {}) {
  const { isMultipart = false, ...fetchOptions } = options;
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  // Build and fire the request
  const fireRequest = (token) => {
    const headers = buildHeaders(isMultipart);
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(url, { ...fetchOptions, headers });
  };

  let response = await fireRequest(getAccessToken());

  // ── 401 handling ──────────────────────────────────────────────────────────
  if (response.status !== 401) return response;

  // Another refresh is already in flight — queue this retry
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      enqueueRequest(
        async (newToken) => {
          try { resolve(await fireRequest(newToken)); }
          catch (err) { reject(err); }
        },
        reject
      );
    });
  }

  // We are the one responsible for refreshing
  isRefreshing = true;
  try {
    const newToken = await callRefreshEndpoint();
    flushQueue(newToken);
    response = await fireRequest(newToken);
    return response;
  } catch (refreshError) {
    rejectQueue(refreshError);
    clearAuthAndRedirect();
    throw refreshError;
  } finally {
    isRefreshing = false;
  }
}

// ── Convenience helpers ──────────────────────────────────────────────────────
/**
 * apiJSON — calls apiFetch and automatically parses the JSON body.
 * Throws an Error with the server's message on non-2xx responses.
 */
export async function apiJSON(endpoint, options = {}) {
  const res = await apiFetch(endpoint, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message || body.title || `HTTP ${res.status}`);
  }
  return body;
}

/**
 * apiUpload — thin wrapper for multipart/form-data file uploads.
 * Pass a FormData object as `body`; do NOT set Content-Type manually.
 */
export async function apiUpload(endpoint, formData) {
  return apiJSON(endpoint, {
    method: 'POST',
    body: formData,
    isMultipart: true,
  });
}
