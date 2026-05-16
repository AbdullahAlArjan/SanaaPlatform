/**
 * FreelancerJS.js — Freelancer dashboard module (ES Module)
 *
 * Loaded by:
 *   freelancer.html         — private dashboard, profile display + service list
 *   FL-edit-profile.html    — edit profile form
 *   FL-manage-services.html — manage services + order list
 *
 * API reference (exact DTO field names, all camelCase):
 *   GET  /api/Freelancers/profile/me  → FreelancerProfileResponse
 *        { userID, fullName, email, profession, bio, experienceYears,
 *          city, availabilityStatus, averageRating, profileImageUrl,
 *          portfolioImages, services: string[], approvalStatus }
 *
 *   PUT  /api/Freelancers/profile     → UpdateFreelancerProfileDto
 *        { profession?, city?, bio? }
 *
 *   GET  /api/Services                → Service[] (own services when authenticated)
 *        assumed: { serviceID, title, description, basePrice, isActive, categoryID }
 *
 *   PUT  /api/Services/{id}           → UpdateServiceRequest
 *        { categoryID?, title, description, basePrice, isActive }
 *
 *   GET  /api/Orders/freelancer?pageNumber=1&pageSize=10
 *   PUT  /api/Orders/{id}/status?status={0|1|2|3}
 */

import { requireAuth, ensureFreelancerProfile, invalidateProfileCache } from './auth.js';
import { apiJSON, apiFetch } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {

    // ── Auth guard ────────────────────────────────────────────────────────────
    // No role restriction here — requireAuth only checks for a valid token.
    // ensureFreelancerProfile() below handles role-level access AND syncs the
    // stored role to 'freelancer' when the API confirms a complete profile.
    // This breaks the stale-token / wrong-role redirect loop.
    const user = requireAuth();
    if (!user) return;

    // ── Profile completeness guard (skip on FL-edit-profile.html itself) ──────
    // Skipping on the edit page prevents the guard from redirecting the user
    // back to the same page they're already on (redirect loop).
    if (!document.getElementById('edit-profile-form')) {
        const profile = await ensureFreelancerProfile();
        if (!profile) return; // redirected by guard (404) or network fail-open (null)
    }

    // ── Route detection — initialise the right module per page ───────────────
    if (document.getElementById('edit-profile-form')) {
        await initEditProfile();
    }

    if (document.getElementById('manage-services-container')) {
        await initManageServices();
        await initOrdersList();
    }

    // freelancer.html dashboard — has services-list but not edit/manage containers
    if (document.getElementById('services-list') &&
        !document.getElementById('edit-profile-form') &&
        !document.getElementById('manage-services-container')) {
        await initFreelancerDashboard(user);
    }

    if (document.getElementById('notificationIcon')) {
        initNotifications();
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// EDIT PROFILE  (FL-edit-profile.html)
// ═══════════════════════════════════════════════════════════════════════════════

async function initEditProfile() {
    try {
        const profile = await apiJSON('/api/Freelancers/profile/me');
        _setVal('profile-location', profile.city    || '');
        _setVal('aboutMeInput',     profile.bio     || '');
        _setVal('whatsAppNumber',   profile.phone || localStorage.getItem('whatsAppNumber') || '');

        if (profile.profileImageUrl) {
            const preview = document.getElementById('profile-picture-preview');
            if (preview) preview.src = profile.profileImageUrl;
        }
    } catch (err) {
        console.error('Edit-profile load error:', err);
        // Non-fatal — user can still type in the empty form
    }

    document.getElementById('edit-profile-form')
        .addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveProfileChanges();
        });
}

async function saveProfileChanges() {
    const city     = document.getElementById('profile-location')?.value.trim() ?? '';
    const bio      = document.getElementById('aboutMeInput')?.value.trim()     ?? '';
    const whatsApp = document.getElementById('whatsAppNumber')?.value.trim()   ?? '';

    // Validate WhatsApp if provided
    if (whatsApp && !/^\+?\d{7,15}$/.test(whatsApp.replace(/[\s\-]/g, ''))) {
        alert('Please enter a valid WhatsApp number (7–15 digits, optionally starting with +).');
        document.getElementById('whatsAppNumber')?.focus();
        return;
    }

    // Validate bio length matches backend DTO maxLength=1000
    if (bio.length > 1000) {
        alert('Bio must be 1000 characters or fewer.');
        return;
    }

    const btn = document.querySelector('#edit-profile-form button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

    try {
        // UpdateFreelancerProfileDto — city, bio, and phone (all nullable/optional)
        await apiJSON('/api/Freelancers/profile', {
            method: 'PUT',
            body: JSON.stringify({ city, bio, phone: whatsApp || null })
        });

        // Keep localStorage in sync as a display cache
        if (whatsApp) localStorage.setItem('whatsAppNumber', whatsApp);

        // Upload new profile picture if chosen
        const fileInput = document.getElementById('profile-picture');
        if (fileInput?.files[0]) {
            const fd = new FormData();
            fd.append('file', fileInput.files[0]);
            await apiFetch('/api/Freelancers/profile-image', {
                method:      'POST',
                body:        fd,
                isMultipart: true,
            });
        }

        // Invalidate session cache so the guard re-validates the completed profile
        invalidateProfileCache();

        alert('Profile saved successfully!');
        window.location.href = 'freelancer.html';
    } catch (err) {
        alert('Failed to save profile: ' + err.message);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
    }
}

// Called from onchange on the file input in FL-edit-profile.html
window.previewProfilePicture = function (event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        const el = document.getElementById('profile-picture-preview');
        if (el) el.src = ev.target.result;
    };
    reader.readAsDataURL(file);
};

// ═══════════════════════════════════════════════════════════════════════════════
// FREELANCER DASHBOARD  (freelancer.html)
// ═══════════════════════════════════════════════════════════════════════════════

async function initFreelancerDashboard(user) {
    // ── 1. Profile ─────────────────────────────────────────────────────────────
    // Prefer the session cache written by ensureFreelancerProfile() — avoids a
    // second round-trip when the guard already fetched this data.
    let profile = null;
    try {
        const raw = sessionStorage.getItem('__fp_data');
        if (raw) profile = JSON.parse(raw);
    } catch { /* cache miss or parse error — fall through */ }

    if (!profile) {
        try {
            profile = await apiJSON('/api/Freelancers/profile/me');
        } catch (err) {
            console.error('[dashboard] Profile fetch failed:', err.message);
            _setText('fullName', user.fullName || '');
            return; // stop here — nothing else to render without profile
        }
    }

    // ── 2. Populate profile UI ─────────────────────────────────────────────────
    _setText('fullName',            profile.fullName   || user.fullName || '');
    _setText('profession',          profile.profession || '');
    _setText('address',             profile.city       || '');
    _setText('profile-description', profile.bio        || 'No bio yet. Click Edit Profile to add one.');

    // Phone / WhatsApp — API is the source of truth
    const phone = profile.phone || '';
    if (phone) localStorage.setItem('whatsAppNumber', phone);
    _setText('phoneNumber', phone || profile.email || '');

    // Average rating
    if (profile.averageRating !== undefined) {
        const ratingEls = document.querySelectorAll('.stat-content h4');
        if (ratingEls[0]) ratingEls[0].textContent = `${Number(profile.averageRating).toFixed(1)}/5`;
    }

    // Profile picture
    if (profile.profileImageUrl) {
        const pic = document.getElementById('profilePicture');
        if (pic) pic.src = profile.profileImageUrl;
    }

    // ── 3. Services — always from the dedicated my-services endpoint ───────────
    // GET /api/Freelancers/my-services returns FreelancerServiceDto[] with full
    // objects (serviceID, title, basePrice, isActive, categoryID).
    // Never fall back to profile.services[] (those are title-only strings).
    try {
        const services = await apiJSON('/api/Freelancers/my-services');
        renderServicesList(Array.isArray(services) ? services : []);
    } catch (err) {
        console.error('[dashboard] Services fetch failed:', err.message);
        renderServicesList([]); // render empty state rather than crash
    }
}

// services: FreelancerServiceDto[] OR string[] (fallback when API is down)
function renderServicesList(services) {
    const container = document.getElementById('services-list');
    if (!container) return;

    if (!services?.length) {
        container.innerHTML =
            '<p style="color:#888">No services posted yet. ' +
            '<a href="FL-post-service.html">Post your first service!</a></p>';
        return;
    }

    container.innerHTML = services.map(s => {
        // Handle both FreelancerServiceDto objects and plain title strings
        const title  = typeof s === 'string' ? s           : _esc(s.title ?? '');
        const price  = typeof s === 'string' ? ''          : `$${Number(s.basePrice).toFixed(2)}`;
        const active = typeof s === 'string' ? true        : s.isActive;
        const id     = typeof s === 'string' ? 0           : (s.serviceID ?? 0);

        return `
        <div class="service-item" style="display:flex;justify-content:space-between;
             align-items:center;padding:0.6rem 0;border-bottom:1px solid #eee;">
            <span style="${!active ? 'opacity:0.5;text-decoration:line-through' : ''}">${title}</span>
            <div style="display:flex;gap:0.75rem;align-items:center">
                ${price ? `<span style="font-weight:600;color:#1877f2">${price}</span>` : ''}
                ${!active ? '<span style="font-size:0.75rem;color:#e74c3c">Inactive</span>' : ''}
                ${id ? `<a href="FL-manage-services.html"
                          style="font-size:0.8rem;color:#888;text-decoration:none">Manage</a>` : ''}
            </div>
        </div>`;
    }).join('');
}

// Called from the WhatsApp button in freelancer.html
window.openWhatsApp = function () {
    const number = localStorage.getItem('whatsAppNumber');
    if (!number) {
        alert('No WhatsApp number set. Please add it in Edit Profile.');
        return;
    }
    window.open(`https://wa.me/${number.replace(/\D/g, '')}`, '_blank');
};

// ═══════════════════════════════════════════════════════════════════════════════
// MANAGE SERVICES  (FL-manage-services.html)
// ═══════════════════════════════════════════════════════════════════════════════

async function initManageServices() {
    const container = document.getElementById('manage-services-container');
    if (!container) return;

    container.innerHTML = '<p>Loading services…</p>';

    try {
        // GET /api/Freelancers/my-services returns only this freelancer's services with full objects
        const myServices = await apiJSON('/api/Freelancers/my-services');

        if (!Array.isArray(myServices) || !myServices.length) {
            container.innerHTML = `<p>No services yet. <a href="FL-post-service.html">Post your first service!</a></p>`;
            return;
        }

        renderManageServices(myServices, container);

    } catch (err) {
        container.innerHTML = `<p style="color:red">Failed to load services: ${_esc(err.message)}</p>`;
    }
}

function renderManageServices(services, container) {
    container.innerHTML = services.map(s => {
        const id = s.serviceID ?? s.id;
        return `
        <div class="service-manage-card" data-service-id="${id}">
            <div class="service-info">
                <h4>${_esc(s.title)}</h4>
                <p>${_esc(s.description || '')}</p>
                <span class="price">$${Number(s.basePrice).toFixed(2)}</span>
            </div>
            <div class="service-toggle-area">
                <label class="toggle-switch" title="${s.isActive ? 'Click to deactivate' : 'Click to activate'}">
                    <input type="checkbox"
                           ${s.isActive ? 'checked' : ''}
                           data-service-id="${id}"
                           data-title="${_esc(s.title)}"
                           data-description="${_esc(s.description || '')}"
                           data-price="${s.basePrice}"
                           data-category="${s.categoryID ?? ''}"
                           onchange="toggleServiceStatus(this)">
                    <span class="toggle-slider"></span>
                </label>
                <span class="toggle-label">${s.isActive ? 'Active' : 'Inactive'}</span>
            </div>
        </div>`;
    }).join('');
}

/**
 * toggleServiceStatus — called from onchange on each toggle checkbox.
 * All UpdateServiceRequest fields are stored in data-* attrs to avoid an extra GET.
 */
window.toggleServiceStatus = async function (checkbox) {
    const id          = parseInt(checkbox.dataset.serviceId);
    const newIsActive = checkbox.checked;
    const label       = checkbox.closest('.service-toggle-area')?.querySelector('.toggle-label');

    checkbox.disabled = true;
    try {
        // PUT /api/Freelancers/my-services/{id} — ownership-verified update
        await apiJSON(`/api/Freelancers/my-services/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                categoryID:  checkbox.dataset.category ? parseInt(checkbox.dataset.category) : null,
                title:       checkbox.dataset.title,
                description: checkbox.dataset.description,
                basePrice:   parseFloat(checkbox.dataset.price),
                isActive:    newIsActive
            })
        });
        if (label) label.textContent = newIsActive ? 'Active' : 'Inactive';
    } catch (err) {
        checkbox.checked = !newIsActive; // revert on failure
        alert('Failed to update service: ' + err.message);
    } finally {
        checkbox.disabled = false;
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ORDER LIST  (FL-manage-services.html)
// ═══════════════════════════════════════════════════════════════════════════════

async function initOrdersList() {
    const container = document.getElementById('order-list-container');
    if (!container) return;

    container.innerHTML = '<p>Loading orders…</p>';

    try {
        const data   = await apiJSON('/api/Orders/freelancer?pageNumber=1&pageSize=10');
        const orders = Array.isArray(data) ? data : (data.items ?? data.data ?? []);

        if (!orders.length) {
            container.innerHTML = '<p>No orders yet.</p>';
            return;
        }

        container.innerHTML = orders.map(o => {
            const oid       = o.id ?? o.orderId;
            const status    = _orderStatusLabel(o.status);
            const isPending = o.status === 0;
            return `
            <div class="order-item">
                <div class="order-info">
                    <h4>Order #${oid}</h4>
                    <p>${_esc(o.description || 'No description provided')}</p>
                    <p><i class="fas fa-map-marker-alt"></i> ${_esc(o.location || '—')}</p>
                    <span class="status-badge">${status}</span>
                </div>
                ${isPending ? `
                <div class="order-actions" style="margin-top:0.75rem;display:flex;gap:0.5rem;">
                    <button class="btn btn-primary"   onclick="respondToOrder(${oid}, 1)">
                        <i class="fas fa-check"></i> Accept
                    </button>
                    <button class="btn btn-secondary" onclick="respondToOrder(${oid}, 3)">
                        <i class="fas fa-times"></i> Decline
                    </button>
                </div>` : ''}
            </div>`;
        }).join('');

    } catch (err) {
        container.innerHTML = `<p style="color:red">Failed to load orders: ${_esc(err.message)}</p>`;
    }
}

// OrderStatus enum: 0=Pending, 1=Accepted, 2=Completed, 3=Cancelled
window.respondToOrder = async function (orderId, status) {
    try {
        await apiJSON(`/api/Orders/${orderId}/status?status=${status}`, { method: 'PUT' });
        await initOrdersList();
    } catch (err) {
        alert('Failed to update order: ' + err.message);
    }
};

function _orderStatusLabel(status) {
    return { 0: 'Pending', 1: 'Accepted', 2: 'Completed', 3: 'Cancelled' }[status] ?? 'Unknown';
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

function initNotifications() {
    const icon     = document.getElementById('notificationIcon');
    const dropdown = document.getElementById('notificationDropdown');
    const markBtn  = document.getElementById('markAllRead');
    const countEl  = document.getElementById('notificationCount');

    if (!icon || !dropdown) return;

    icon.addEventListener('click', e => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
    });

    document.addEventListener('click', e => {
        if (!icon.contains(e.target)) dropdown.classList.remove('active');
    });

    markBtn?.addEventListener('click', () => {
        dropdown.querySelectorAll('.notification-item.unread')
            .forEach(el => el.classList.remove('unread'));
        if (countEl) { countEl.textContent = '0'; countEl.style.display = 'none'; }
        dropdown.classList.remove('active');
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function _setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function _setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}

function _esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
