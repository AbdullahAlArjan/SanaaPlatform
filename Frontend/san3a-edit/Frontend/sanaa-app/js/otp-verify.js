/**
 * otp-verify.js — Email OTP verification page for Sanaa Platform
 *
 * Flow: Registration / Login (EMAIL_NOT_VERIFIED)
 *   → email saved to sessionStorage('otpEmail')
 *   → redirect here
 *   → user enters 6-digit code
 *   → POST /api/auth/verify-otp
 *   → on success: redirect to Login
 */

import { apiFetch } from '../../js/api.js';

document.addEventListener('DOMContentLoaded', () => {

  // ── Read email forwarded from login/register ──────────────────────────────
  const email =
    sessionStorage.getItem('otpEmail') ||
    new URLSearchParams(location.search).get('email') ||
    '';

  // ── Element references ────────────────────────────────────────────────────
  const emailDisplay = document.getElementById('emailDisplay');
  const otpBoxes     = Array.from(document.querySelectorAll('.otp-box'));
  const verifyBtn    = document.getElementById('verifyBtn');
  const btnSpinner   = document.getElementById('btnSpinner');
  const btnText      = document.getElementById('btnText');
  const alertBox     = document.getElementById('alertBox');
  const resendBtn    = document.getElementById('resendBtn');
  const timerText    = document.getElementById('timerText');
  const countdown    = document.getElementById('countdown');

  emailDisplay.textContent = email || 'your email';

  // ── Alert helper ──────────────────────────────────────────────────────────
  function showAlert(message, type = 'error') {
    alertBox.textContent  = message;
    alertBox.className    = `alert alert-${type}`;
    alertBox.style.display = 'block';
  }

  function hideAlert() {
    alertBox.style.display = 'none';
  }

  // ── OTP box interactions ──────────────────────────────────────────────────
  otpBoxes.forEach((box, i) => {
    // Only allow single digits
    box.addEventListener('input', () => {
      box.value = box.value.replace(/\D/g, '').slice(-1);
      if (box.value && i < otpBoxes.length - 1) {
        otpBoxes[i + 1].focus();
      }
      syncVerifyButton();
      hideAlert();
    });

    // Backspace jumps to previous box
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && i > 0) {
        otpBoxes[i - 1].focus();
      }
    });

    // Paste fills all boxes at once
    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const digits = e.clipboardData.getData('text').replace(/\D/g, '');
      digits.split('').forEach((ch, j) => {
        if (j < otpBoxes.length) otpBoxes[j].value = ch;
      });
      const lastFilled = Math.min(digits.length, otpBoxes.length) - 1;
      otpBoxes[lastFilled]?.focus();
      syncVerifyButton();
    });
  });

  function getCode() {
    return otpBoxes.map(b => b.value).join('');
  }

  function syncVerifyButton() {
    verifyBtn.disabled = getCode().length < otpBoxes.length;
  }

  // Focus first box on load
  otpBoxes[0]?.focus();

  // ── Verify button ─────────────────────────────────────────────────────────
  verifyBtn.addEventListener('click', async () => {
    const code = getCode();

    verifyBtn.disabled           = true;
    btnSpinner.style.display     = 'inline-block';
    btnText.textContent          = 'Verifying…';
    hideAlert();

    try {
      const res = await apiFetch('/api/auth/verify-otp', {
        method: 'POST',
        body:   JSON.stringify({ Email: email, Code: code, Purpose: 'EmailVerification' }),
      });

      if (!res.ok) {
        throw new Error('Invalid or expired code. Please try again.');
      }

      showAlert('Email verified! Redirecting to login…', 'success');
      sessionStorage.removeItem('otpEmail');

      setTimeout(() => {
        window.location.href = '../Login/Login.html';
      }, 1500);

    } catch (err) {
      showAlert(err.message || 'Something went wrong. Please try again.');
      // Clear boxes and restart entry
      otpBoxes.forEach(b => { b.value = ''; });
      otpBoxes[0]?.focus();
      verifyBtn.disabled = true;

    } finally {
      btnSpinner.style.display = 'none';
      btnText.textContent      = 'Verify Email';
    }
  });

  // ── Resend countdown ──────────────────────────────────────────────────────
  let countdownTimer = null;

  function startCountdown(seconds = 60) {
    clearInterval(countdownTimer);
    resendBtn.style.display  = 'none';
    timerText.style.display  = 'inline';
    countdown.textContent    = seconds;

    countdownTimer = setInterval(() => {
      seconds--;
      countdown.textContent = seconds;
      if (seconds <= 0) {
        clearInterval(countdownTimer);
        timerText.style.display = 'none';
        resendBtn.style.display = 'inline';
      }
    }, 1000);
  }

  startCountdown();

  resendBtn.addEventListener('click', async () => {
    resendBtn.disabled = true;
    hideAlert();

    try {
      const res = await apiFetch('/api/auth/send-otp', {
        method: 'POST',
        body:   JSON.stringify({ Email: email, Purpose: 'EmailVerification' }),
      });

      if (!res.ok) {
        throw new Error('Could not resend. Please wait a moment and try again.');
      }

      showAlert('A new code has been sent to your email.', 'success');
      startCountdown();

    } catch (err) {
      showAlert(err.message || 'Failed to resend. Please try again.');
      resendBtn.disabled = false;
    }
  });

});
