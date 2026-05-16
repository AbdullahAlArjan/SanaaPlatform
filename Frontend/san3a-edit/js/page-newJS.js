/**
 * page-newJS.js — Post New Service (ES Module)
 * Loaded exclusively by FL-post-service.html
 *
 * API used:
 *   GET  /api/Categories?pageSize=50       → Category[]
 *        C# property: CategoryID → camelCase JSON: categoryID
 *   POST /api/Freelancers/my-services      → CreateServiceRequest
 *        { categoryID: int, title: string, description: string, basePrice: number }
 */

import { requireAuth, ensureFreelancerProfile, invalidateProfileCache } from './auth.js';
import { apiJSON, apiUpload } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {

    // ── Auth guard ────────────────────────────────────────────────────────────
    // No role restriction — ensureFreelancerProfile() handles access control
    // and syncs the stored role, breaking the stale-token loop.
    const user = requireAuth();
    if (!user) return;

    // ── Profile completeness guard ────────────────────────────────────────────
    const profile = await ensureFreelancerProfile();
    if (!profile) return; // redirected (404/incomplete) or fail-open (network)

    // ── Populate category dropdown from API ───────────────────────────────────
    await loadCategories();

    // ── Image file counter ────────────────────────────────────────────────────
    const imgInput = document.getElementById('service-images');
    const imgCount = document.getElementById('service-images-count');
    imgInput?.addEventListener('change', () => {
        const n = imgInput.files?.length ?? 0;
        if (imgCount) imgCount.textContent = n > 0 ? `${n} file(s) selected` : '';
    });

    // ── Wire form submission ──────────────────────────────────────────────────
    const form = document.getElementById('post-service-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await postNewService();
        });
    }
});

/**
 * loadCategories — fetches the 6 seeded categories from the backend and
 * replaces the hardcoded <option> list so freelancers can only pick valid ones.
 *
 * C# serialises CategoryID → "categoryID" (camelCase).
 * If the API is unreachable the select is disabled with a warning message.
 */
async function loadCategories() {
    const select = document.getElementById('service-category');
    if (!select) return;

    try {
        const raw  = await apiJSON('/api/Categories?pageSize=50');
        // Handle both plain array and paginated wrapper { data: [], total: n }
        const list = Array.isArray(raw) ? raw : (raw.data ?? raw.items ?? []);

        if (!list.length) {
            _markCategoryUnavailable(select, 'No categories available yet.');
            return;
        }

        // Rebuild the <select> with only valid API categories
        select.innerHTML = '<option value="">-- Select a Category --</option>';
        list.forEach(cat => {
            // C# CategoryID → camelCase → "categoryID"
            const id   = cat.categoryID ?? cat.id ?? '';
            const name = cat.name ?? '';
            if (!id || !name) return; // skip malformed entries

            const opt   = document.createElement('option');
            opt.value       = id;        // always an integer from the DB
            opt.textContent = name;
            select.appendChild(opt);
        });

        select.disabled = false;
    } catch (err) {
        console.warn('[page-newJS] Categories load failed:', err.message);
        _markCategoryUnavailable(select, 'Could not load categories. Is the backend running?');
    }
}

function _markCategoryUnavailable(select, msg) {
    select.innerHTML = `<option value="">${msg}</option>`;
    select.disabled  = true;
}

/**
 * postNewService — validates the form and sends POST /api/Services.
 * CreateServiceRequest DTO (exact field names):
 *   categoryID  int?    — nullable, from the category dropdown value
 *   title       string  — service name
 *   description string  — service description
 *   basePrice   number  — decimal price
 *
 * Note: the form also has service-estimation-time, service-tools, and
 * service-attachment fields which the current backend DTO does not yet support.
 * They are validated in the UI but not sent to the API until the DTO is extended.
 */
async function postNewService() {
    const title       = document.getElementById('service-name')?.value.trim()        ?? '';
    const categoryRaw = document.getElementById('service-category')?.value           ?? '';
    const description = document.getElementById('service-description')?.value.trim() ?? '';
    const priceRaw    = document.getElementById('service-price')?.value              ?? '';
    const isActiveVal = document.getElementById('service-availability')?.value       ?? 'active';

    // ── Client-side validation ────────────────────────────────────────────────
    if (!title) {
        alert('Please enter a service name.');
        document.getElementById('service-name')?.focus();
        return;
    }
    if (!description) {
        alert('Please enter a service description.');
        document.getElementById('service-description')?.focus();
        return;
    }
    const basePrice = parseFloat(priceRaw);
    if (isNaN(basePrice) || basePrice <= 0) {
        alert('Please enter a valid price greater than 0.');
        document.getElementById('service-price')?.focus();
        return;
    }

    // Category is required — freelancers must pick from the 6 valid DB categories
    const categoryID = parseInt(categoryRaw, 10);
    if (!categoryRaw || isNaN(categoryID) || categoryID <= 0) {
        alert('Please select a category.');
        document.getElementById('service-category')?.focus();
        return;
    }

    const btn = document.querySelector('#post-service-form button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Posting…'; }

    try {
        // Step 1 — POST /api/Freelancers/my-services
        // Creates Service + FreelancerService junction atomically.
        // Capture the response so serviceID is available for the image upload step.
        const service = await apiJSON('/api/Freelancers/my-services', {
            method: 'POST',
            body: JSON.stringify({
                categoryID,
                title,
                description,
                basePrice
            })
        });

        // Step 2 — Image upload (optional, non-blocking on failure)
        // apiUpload uses isMultipart:true so the browser sets the Content-Type boundary.
        const imageFiles = document.getElementById('service-images')?.files;
        if (imageFiles?.length > 0 && service?.serviceID) {
            try {
                const fd    = new FormData();
                const limit = Math.min(imageFiles.length, 5); // cap at 5 images
                for (let i = 0; i < limit; i++) fd.append('files', imageFiles[i]);

                await apiUpload(
                    `/api/Freelancers/my-services/${service.serviceID}/images`,
                    fd
                );
            } catch (imgErr) {
                // Non-fatal: service is already created; images can be added later
                console.warn('[page-new] Image upload failed (service created):', imgErr.message);
            }
        }

        alert('Service posted successfully!');
        window.location.href = 'freelancer.html';
    } catch (err) {
        alert('Failed to post service: ' + err.message);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Post Service'; }
    }
}
