/**
 * FreelancerReg.js — Freelancer profile completion form
 * Loaded by FreelancerReg.html (not a module — no static imports)
 *
 * Flow:
 *  1. Page load:  verify token present (redirect to login if missing)
 *  2. Page load:  call POST /api/Freelancers/onboard to ensure role + skeleton profile exist
 *  3. Form submit: call PUT  /api/Freelancers/profile  (upsert — never 404)
 *  4. Form submit: optionally upload portfolio image
 *  5. On success:  redirect to freelancer.html (tokens already reflect Freelancer role)
 */

document.addEventListener('DOMContentLoaded', async () => {
    // ── Page-level auth guard ────────────────────────────────────────────────
    const token      = localStorage.getItem('accessToken');
    const storedUser = (() => {
        try { return JSON.parse(localStorage.getItem('currentUser') || 'null'); }
        catch { return null; }
    })();

    if (!token || !storedUser) {
        // No session — send to login with the freelancer intent preserved
        window.location.href = 'Login.html?next=freelancer';
        return;
    }

    // ── Wire file-input previews ─────────────────────────────────────────────
    const cvInput           = document.getElementById('cv');
    const workSamplesInput  = document.getElementById('work-samples');
    const cvName            = document.getElementById('cvName');
    const workSamplesName   = document.getElementById('workSamplesName');
    const workSamplesPreview = document.getElementById('workSamplesPreview');

    cvInput?.addEventListener('change', () => {
        cvName.textContent = cvInput.files[0]?.name || 'No file chosen';
    });

    workSamplesInput?.addEventListener('change', () => {
        const file = workSamplesInput.files[0];
        if (!file) {
            workSamplesName.textContent    = 'No file chosen';
            workSamplesPreview.innerHTML   = '';
            return;
        }
        workSamplesName.textContent = file.name;
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = e => { workSamplesPreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`; };
            reader.readAsDataURL(file);
        } else {
            workSamplesPreview.innerHTML = '';
        }
    });

    // ── Form submission ──────────────────────────────────────────────────────
    const freelancerForm = document.getElementById('freelancerForm');
    if (!freelancerForm) return;

    freelancerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Dynamic import keeps this file non-module while still using the central API layer
        const { apiFetch, apiJSON, apiUpload } = await import('./api.js');

        const profession = document.getElementById('profession')?.value.trim() || '';
        const address    = document.getElementById('address')?.value.trim()    || '';
        const submitBtn  = freelancerForm.querySelector('button[type="submit"]');

        submitBtn.disabled  = true;
        submitBtn.innerText = 'Saving…';

        try {
            // Step 1: Upsert profile — PUT handles both create and update
            // (EnsureProfileExistsAsync has already run via the onboard call in login.js)
            await apiJSON('/api/Freelancers/profile', {
                method: 'PUT',
                body: JSON.stringify({
                    profession,
                    city: address,
                    // bio and phone are set on FL-edit-profile.html
                })
            });

            // Step 2: Upload portfolio image if one was selected
            const workFile = workSamplesInput?.files[0];
            if (workFile) {
                const fd = new FormData();
                fd.append('file', workFile);
                await apiUpload('/api/Freelancers/portfolio', fd);
            }

            // Step 3: Redirect to the private dashboard (tokens already carry Freelancer role)
            alert('Profile saved! Redirecting to your dashboard…');
            window.location.href = 'freelancer.html';

        } catch (err) {
            console.error('[FreelancerReg] Submit error:', err);
            alert('Error: ' + (err.message || 'Unknown error. Is the backend running?'));
        } finally {
            submitBtn.disabled  = false;
            submitBtn.innerText = 'Save & Continue';
        }
    });
});
