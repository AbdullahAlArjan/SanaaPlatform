import { login, redirectByRole } from './auth.js';

document.addEventListener('DOMContentLoaded', function () {

  // ── Password visibility toggle ────────────────────────────────────────────
  const togglePassword = document.getElementById('togglePassword');
  const passwordInput  = document.getElementById('password');

  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function () {
      const isHidden = passwordInput.getAttribute('type') === 'password';
      passwordInput.setAttribute('type', isHidden ? 'text' : 'password');
      this.querySelector('i').classList.toggle('fa-eye-slash');
    });
  }

  // ── Login form ────────────────────────────────────────────────────────────
  const loginForm    = document.getElementById('loginForm');
  const submitBtn    = loginForm?.querySelector('button[type="submit"]');
  const errorDiv     = document.getElementById('errorMessage');

  function showError(msg) {
    if (!errorDiv) return;
    errorDiv.textContent = msg;
    errorDiv.style.display = 'block';
  }

  function clearError() {
    if (!errorDiv) return;
    errorDiv.style.display = 'none';
    errorDiv.textContent   = '';
  }

  function setLoading(isLoading) {
    if (!submitBtn) return;
    submitBtn.disabled   = isLoading;
    submitBtn.textContent = isLoading ? 'Logging in…' : 'Login';
  }

  if (loginForm) {
    // Clear error when user starts typing again
    loginForm.addEventListener('input', clearError);

    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      clearError();

      const email    = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      if (!email || !password) {
        showError('Please enter your email and password.');
        return;
      }

      setLoading(true);
      try {
        const { user } = await login(email, password);
        redirectByRole(user.role);
      } catch (err) {
        if (err.code === 'EMAIL_NOT_VERIFIED') {
          // Preserve email so otp-verify.html can pre-fill it
          sessionStorage.setItem('pendingVerifyEmail', email);
          window.location.href = 'otp-verify.html';
          return;
        }
        showError(err.message || 'Invalid email or password. Please try again.');
      } finally {
        setLoading(false);
      }
    });
  }

  // ── Forgot-password modal ─────────────────────────────────────────────────
  const forgotLink    = document.getElementById('forgotPasswordLink');
  const modal         = document.getElementById('forgotPasswordModal');
  const closeModal    = modal?.querySelector('.close-modal');
  const forgotForm    = document.getElementById('forgotPasswordForm');
  const forgotMessage = document.getElementById('forgotPasswordMessage');

  if (forgotLink && modal) {
    forgotLink.addEventListener('click', function (e) {
      e.preventDefault();
      modal.style.display = 'flex';
    });

    closeModal?.addEventListener('click', () => { modal.style.display = 'none'; });

    window.addEventListener('click', function (e) {
      if (e.target === modal) modal.style.display = 'none';
    });

    forgotForm?.addEventListener('submit', async function (e) {
      e.preventDefault();
      const email = document.getElementById('forgotEmail').value.trim();
      if (!email) return;

      try {
        await fetch(`${(await import('./api.js')).API_BASE_URL}/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
      } catch { /* always show success to prevent email enumeration */ }

      if (forgotMessage) forgotMessage.style.display = 'block';

      setTimeout(() => {
        forgotForm.reset();
        if (forgotMessage) forgotMessage.style.display = 'none';
        modal.style.display = 'none';
      }, 3000);
    });
  }

});
