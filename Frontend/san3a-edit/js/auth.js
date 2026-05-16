/**
 * auth.js — Authentication service for Sanaa Platform
 */

import { API_BASE_URL, apiFetch, apiJSON } from './api.js';

// ── Role → page mapping (roles come from backend as "Client", "Freelancer", "Admin") ──
const ROLE_REDIRECT = {
  admin:      'Admin.html',
  client:     'customer.html',
  freelancer: 'freelancer.html',
};

// ── Login ────────────────────────────────────────────────────────────────────

export async function login(email, password) {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(body.message || body.title || 'Invalid email or password.');
    err.code = body.code ?? null;
    throw err;
  }

  const userObj = {
    role:     (body.role || 'client').toLowerCase().trim(),
    email:    body.email || email,
    fullName: body.fullName || 'User',
  };

  localStorage.setItem('accessToken',  body.accessToken);
  localStorage.setItem('refreshToken', body.refreshToken ?? '');
  localStorage.setItem('currentUser',  JSON.stringify(userObj));

  return { token: body.accessToken, refreshToken: body.refreshToken, user: userObj };
}

// ── Logout ───────────────────────────────────────────────────────────────────

export async function logout() {
  const refreshToken = localStorage.getItem('refreshToken');
  try {
    if (refreshToken) {
      await apiFetch('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    }
  } catch { /* ignore */ }
  finally {
    _clearStorage();
    window.location.href = 'Login.html';
  }
}

// ── Redirect helpers ─────────────────────────────────────────────────────────

export function redirectByRole(role) {
  if (!role) {
    window.location.href = 'Login.html';
    return;
  }
  const safeRole = role.toLowerCase().trim();
  const target = ROLE_REDIRECT[safeRole] ?? 'Login.html';
  window.location.href = target;
}

export function requireAuth(allowedRoles = []) {
  const user  = getCurrentUser();
  const token = localStorage.getItem('accessToken');

  if (!token || !user) {
    window.location.href = 'Login.html';
    return false;
  }

  const userRole          = user.role.toLowerCase().trim();
  const allowedRolesLower = allowedRoles.map(r => r.toLowerCase().trim());

  if (allowedRolesLower.length > 0 && !allowedRolesLower.includes(userRole)) {
    redirectByRole(user.role);
    return false;
  }
  return user;
}

// ── Storage helpers ──────────────────────────────────────────────────────────

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem('currentUser');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function isAuthenticated() {
  return Boolean(localStorage.getItem('accessToken'));
}

export function updateStoredUser(patch) {
  try {
    const user = getCurrentUser() ?? {};
    localStorage.setItem('currentUser', JSON.stringify({ ...user, ...patch }));
  } catch { /* ignore */ }
}

// ── Freelancer Profile Guard ──────────────────────────────────────────────────

/**
 * Mandatory guard for freelancer-protected pages.
 *
 * Routing contract (no ambiguity):
 *   200 + bio & phone present  → return profile (access granted)
 *   200 + bio or phone missing → redirect to FL-edit-profile.html (incomplete)
 *   404                        → redirect to FL-edit-profile.html (no profile)
 *   401                        → apiFetch handles refresh; if unrecoverable → Login.html
 *   5xx / network error        → FAIL OPEN — return null without redirecting
 *                                (prevents trapping the user on transient server errors)
 *
 * Session cache: writes the verified profile to sessionStorage on first success.
 * Subsequent page navigations skip the API round-trip entirely.
 * Call invalidateProfileCache() after any profile update to force a re-check.
 */
export async function ensureFreelancerProfile() {
  // ── Session cache hit ───────────────────────────────────────────────────────
  try {
    if (sessionStorage.getItem('__fp_ok') === '1') {
      const raw = sessionStorage.getItem('__fp_data');
      const cached = raw ? JSON.parse(raw) : {};
      console.debug('[auth:guard] Cache hit — profile confirmed');
      return cached;
    }
  } catch { /* parse error — fall through to live check */ }

  // ── Live API check ──────────────────────────────────────────────────────────
  let res;
  try {
    // Use apiFetch (not apiJSON) so we inspect the raw status code
    res = await apiFetch('/api/Freelancers/profile/me');
  } catch (networkErr) {
    // Genuine network failure (backend down, CORS, timeout)
    // FAIL OPEN — do NOT redirect; the user already completed their profile
    console.error('[auth:guard] Network error — failing open:', networkErr.message);
    return null;
  }

  // 404 → FreelancerProfile row literally does not exist in the DB
  if (res.status === 404) {
    console.warn('[auth:guard] 404 — no profile record, redirecting to edit');
    window.location.href = 'FL-edit-profile.html';
    return null;
  }

  // Any non-2xx that is NOT 404 (401 handled by apiFetch refresh; 5xx = transient)
  if (!res.ok) {
    console.warn(`[auth:guard] ${res.status} — failing open to avoid loop`);
    return null;
  }

  // Parse the profile body
  const profile = await res.json().catch(() => null);
  if (!profile) {
    console.warn('[auth:guard] Unparseable profile body — failing open');
    return null;
  }

  // ── Completeness gate ───────────────────────────────────────────────────────
  // Bio and Phone are the two mandatory fields for service-posting access.
  // Profession is set via FreelancerReg.html and is a softer requirement.
  const isIncomplete = !profile.bio?.trim() || !profile.phone?.trim();
  if (isIncomplete) {
    console.warn('[auth:guard] Profile incomplete (bio/phone) — redirecting to edit');
    window.location.href = 'FL-edit-profile.html';
    return null;
  }

  // ── Sync role in localStorage to match DB state ─────────────────────────────
  // Fixes the stale-token issue: even if the JWT still carries role="Client",
  // the confirmed profile proves the user IS a Freelancer in the DB.
  updateStoredUser({ role: 'freelancer' });

  // ── Cache for this browser session ─────────────────────────────────────────
  try {
    sessionStorage.setItem('__fp_ok',   '1');
    sessionStorage.setItem('__fp_data', JSON.stringify(profile));
  } catch { /* storage quota — non-fatal */ }

  return profile;
}

/**
 * Clears the profile session cache. Call this immediately after any successful
 * PUT /api/Freelancers/profile so the guard re-validates on the next page load.
 */
export function invalidateProfileCache() {
  sessionStorage.removeItem('__fp_ok');
  sessionStorage.removeItem('__fp_data');
}

function _clearStorage() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('currentUser');
}
