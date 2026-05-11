/**
 * auth.js — Authentication service for Sanaa Platform
 */

import { API_BASE_URL, apiFetch } from './api.js';

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

function _clearStorage() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('currentUser');
}
