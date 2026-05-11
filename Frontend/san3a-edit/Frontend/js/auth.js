/**
 * auth.js — Authentication service for Sanaa Platform
 * Lives in /js/ — imports api.js from the same folder.
 */

import { API_BASE_URL, apiFetch } from './api.js';

// ── Depth-aware path helper ───────────────────────────────────────────────────
// Counts how many folder levels deep the current PAGE is, then builds a prefix
// so that paths always resolve correctly regardless of which page calls them.
// Works on Live Server, GitHub Pages, and plain file hosting.
//
//   /Login/Login.html       → depth 1 → prefix '../'
//   /sanaa-app/otp.html     → depth 1 → prefix '../'
//   /admin/users/index.html → depth 2 → prefix '../../'
//
function getPrefix() {
  const depth = window.location.pathname.split('/').filter(Boolean).length - 1;
  return depth > 0 ? '../'.repeat(depth) : '';
}

// Compute once at module load — the page URL never changes during a session.
const PREFIX = getPrefix();

const LOGIN_URL = PREFIX + 'Login/Login.html';

// Update these as dashboard pages are wired up.
const ROLE_REDIRECT = {
  admin:      PREFIX + 'admin/index.html',
  customer:   PREFIX + 'sanaa-app/dashboard-customer.html',
  freelancer: PREFIX + 'sanaa-app/dashboard-freelancer.html',
};

// ── JWT decoder ───────────────────────────────────────────────────────────────
function decodeJwtPayload(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return {};
  }
}

// ── Core auth operations ──────────────────────────────────────────────────────

export async function login(email, password) {
  const res = await fetch(`${API_BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const body = await res.json().catch(() => ({}));

  // 403 + sentinel token → email not verified
  if (res.status === 403 && body.accessToken === 'EMAIL_NOT_VERIFIED') {
    const err = new Error('Please verify your email before logging in.');
    err.code = 'EMAIL_NOT_VERIFIED';
    throw err;
  }

  if (!res.ok) {
    const err = new Error(body.message || body.title || 'Invalid email or password.');
    err.code = body.code ?? null;
    throw err;
  }

  const token        = body.accessToken;
  const refreshToken = body.refreshToken || '';

  // Decode JWT to extract role, email, fullName — not present in the response body
  const claims = decodeJwtPayload(token);
  const userObj = {
    role: (
      claims.role ||
      claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
      'customer'
    ).toLowerCase().trim(),
    email: claims.email ||
           claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
           email,
    fullName: claims.unique_name ||
              claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
              'User',
  };

  localStorage.setItem('accessToken',  token);
  localStorage.setItem('refreshToken', refreshToken);
  localStorage.setItem('currentUser',  JSON.stringify(userObj));

  return { token, refreshToken, user: userObj };
}

export async function logout() {
  const refreshToken = localStorage.getItem('refreshToken');
  try {
    if (refreshToken) {
      await apiFetch('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    }
  } catch { /* ignore — clear local state regardless */ }
  finally {
    _clearStorage();
    window.location.href = LOGIN_URL;
  }
}

export function redirectByRole(role) {
  if (!role) {
    window.location.href = LOGIN_URL;
    return;
  }
  const safeRole   = role.toLowerCase().trim();
  const targetPage = ROLE_REDIRECT[safeRole] ?? LOGIN_URL;
  console.log(`[auth] Redirecting role "${safeRole}" → ${targetPage}`);
  window.location.href = targetPage;
}

export function requireAuth(allowedRoles = []) {
  const user  = getCurrentUser();
  const token = localStorage.getItem('accessToken');

  if (!token || !user) {
    window.location.href = LOGIN_URL;
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

// ── Storage helpers ───────────────────────────────────────────────────────────

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

function _clearStorage() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('currentUser');
}
