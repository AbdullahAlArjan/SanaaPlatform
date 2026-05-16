import { login, redirectByRole } from './auth.js';

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
        e.preventDefault(); // 🛑 هاي اللي رح تمنع الصفحة تطير
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

            // ── Freelancer onboarding path ────────────────────────────────────
            // Triggered when the user arrived here via Login.html?next=freelancer
            // (set by otpJS.JS after email verification).
            const params = new URLSearchParams(window.location.search);
            if (params.get('next') === 'freelancer') {
                // Call the onboard endpoint — promotes role + creates skeleton profile
                // + returns fresh tokens with Role = "Freelancer" (no re-login needed).
                const { apiJSON } = await import('./api.js');
                try {
                    const res = await apiJSON('/api/Freelancers/onboard', { method: 'POST' });
                    // Store the fresh tokens so subsequent apiFetch calls use Freelancer role
                    localStorage.setItem('accessToken',  res.accessToken);
                    localStorage.setItem('refreshToken', res.refreshToken);
                    localStorage.setItem('currentUser',
                        JSON.stringify({ ...user, role: (res.role || 'freelancer').toLowerCase() }));
                } catch (onboardErr) {
                    console.warn('[login] Onboard call failed:', onboardErr.message);
                    // Non-fatal — still redirect to FreelancerReg.html; the page guard handles it
                }
                window.location.href = 'FreelancerReg.html';
                return;
            }
            // ─────────────────────────────────────────────────────────────────

            redirectByRole(user.role);
        } catch (err) {
            if (err.code === 'EMAIL_NOT_VERIFIED') {
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
            const { API_BASE_URL } = await import('./api.js');
            await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
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