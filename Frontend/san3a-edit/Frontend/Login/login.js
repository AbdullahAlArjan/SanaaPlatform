/**
 * login.js — Login page logic for Sanaa Platform
 *
 * Connects Login.html to the backend via auth.js / api.js.
 * Does NOT touch any CSS classes or visual structure.
 */

import { login, redirectByRole, isAuthenticated, getCurrentUser } from '../js/auth.js';
import { apiJSON } from '../js/api.js';

document.addEventListener('DOMContentLoaded', () => {

  // ── Skip login page if already authenticated ────────────────────────────
  if (isAuthenticated()) {
    const user = getCurrentUser();
    redirectByRole(user?.role);
    return;
  }

  // ── Element references ──────────────────────────────────────────────────
  const loginForm       = document.getElementById('loginForm');
  const emailInput      = document.getElementById('email');
  const passwordInput   = document.getElementById('password');
  const togglePassword  = document.getElementById('togglePassword');
  const errorMessage    = document.getElementById('errorMessage');
  const loginBtn        = loginForm.querySelector('.login-btn');

  const forgotPasswordLink  = document.getElementById('forgotPasswordLink');
  const forgotPasswordModal = document.getElementById('forgotPasswordModal');
  const closeModal          = document.querySelector('.close-modal');
  const forgotPasswordForm  = document.getElementById('forgotPasswordForm');
  const forgotEmailInput    = document.getElementById('forgotEmail');
  const forgotPasswordMsg   = document.getElementById('forgotPasswordMessage');
  const resetBtn            = forgotPasswordForm.querySelector('.reset-btn');

  // ── Password visibility toggle ──────────────────────────────────────────
  togglePassword.addEventListener('click', () => {
    const isHidden = passwordInput.getAttribute('type') === 'password';
    passwordInput.setAttribute('type', isHidden ? 'text' : 'password');
    togglePassword.querySelector('i').classList.toggle('fa-eye',      !isHidden);
    togglePassword.querySelector('i').classList.toggle('fa-eye-slash',  isHidden);
  });

  // ── Clear error when user starts typing ─────────────────────────────────
  [emailInput, passwordInput].forEach(input => {
    input.addEventListener('input', () => {
      errorMessage.style.display = 'none';
    });
  });

  // ── Login form submit ───────────────────────────────────────────────────
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email    = emailInput.value.trim();
    const password = passwordInput.value;

    // Loading state
    loginBtn.textContent = 'Signing in…';
    loginBtn.disabled    = true;
    errorMessage.style.display = 'none';

    try {
      const { user } = await login(email, password);
      redirectByRole(user.role);

    } catch (err) {
      if (err.code === 'EMAIL_NOT_VERIFIED') {
        sessionStorage.setItem('otpEmail', email); // carry email to OTP page
        window.location.href = '../sanaa-app/otp-verify.html';
        return;
      }
      errorMessage.textContent   = err.message;
      errorMessage.style.display = 'block';

    } finally {
      loginBtn.textContent = 'Login';
      loginBtn.disabled    = false;
    }
  });

  // ── Forgot password — modal open / close ────────────────────────────────
  forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    forgotPasswordModal.style.display = 'flex';
  });

  closeModal.addEventListener('click', () => {
    forgotPasswordModal.style.display = 'none';
  });

  window.addEventListener('click', (e) => {
    if (e.target === forgotPasswordModal) {
      forgotPasswordModal.style.display = 'none';
    }
  });

  // ── Forgot password — form submit ───────────────────────────────────────
  forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = forgotEmailInput.value.trim();

    resetBtn.textContent = 'Sending…';
    resetBtn.disabled    = true;
    forgotPasswordMsg.style.display = 'none';

    try {
      // Backend always returns 200 regardless of whether the email exists
      // (prevents email enumeration attacks) — we silence any error intentionally
      await apiJSON('/api/auth/forgot-password', {
        method: 'POST',
        body:   JSON.stringify({ email }),
      });
    } catch { /* intentionally silent */ }

    forgotPasswordMsg.style.display = 'block';

    setTimeout(() => {
      forgotPasswordForm.reset();
      forgotPasswordMsg.style.display   = 'none';
      forgotPasswordModal.style.display = 'none';
      resetBtn.textContent = 'Send Reset Link';
      resetBtn.disabled    = false;
    }, 3000);
  });

});
