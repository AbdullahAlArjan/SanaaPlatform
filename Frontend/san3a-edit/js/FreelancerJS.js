/**
 * FreelancerJS.js — Freelancer dashboard module (ES Module)
 *
 * Pages:
 *   freelancer.html         — main dashboard (profile + orders + stats + services)
 *   FL-edit-profile.html    — edit profile form
 *   FL-manage-services.html — service toggle + order list
 *
 * API endpoints (confirmed against controllers):
 *   GET  /api/Freelancers/profile/me
 *   PUT  /api/Freelancers/profile
 *   GET  /api/Freelancers/my-services
 *   PUT  /api/Freelancers/my-services/{id}
 *   GET  /api/Orders/freelancer?pageNumber=1&pageSize=10
 *   PUT  /api/Orders/{id}/status?status={0|1|2|3}
 */

import { requireAuth, ensureFreelancerProfile, invalidateProfileCache } from './auth.js';
import { apiJSON, apiFetch, resolveMediaUrl, API_BASE_URL } from './api.js';

// ── OrderStatus enum values (must match backend) ──────────────────────────────
const ORDER_STATUS = { Pending: 0, Accepted: 1, Rejected: 2, Completed: 3 };

document.addEventListener('DOMContentLoaded', async () => {

    // ── Auth guard ────────────────────────────────────────────────────────────
    const user = requireAuth();
    if (!user) return;

    if (!document.getElementById('edit-profile-form')) {
        const profile = await ensureFreelancerProfile();
        if (!profile) return;
    }

    // ── Route detection ───────────────────────────────────────────────────────
    if (document.getElementById('edit-profile-form')) {
        await initEditProfile();
    }

    if (document.getElementById('manage-services-container')) {
        await initManageServices();
        await initOrdersList();
    }

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
        _setVal('whatsAppNumber',   profile.phone   || localStorage.getItem('whatsAppNumber') || '');

        if (profile.profileImageUrl) {
            const preview = document.getElementById('profile-picture-preview');
            if (preview) preview.src = _resolveAvatar(profile.profileImageUrl, profile.fullName);
        }
    } catch (err) {
        console.error('[FL] Edit-profile load error:', err.message);
    }

    document.getElementById('edit-profile-form')
        ?.addEventListener('submit', async e => {
            e.preventDefault();
            await saveProfileChanges();
        });
}

async function saveProfileChanges() {
    const city     = document.getElementById('profile-location')?.value.trim() ?? '';
    const bio      = document.getElementById('aboutMeInput')?.value.trim()     ?? '';
    const whatsApp = document.getElementById('whatsAppNumber')?.value.trim()   ?? '';

    if (whatsApp && !/^\+?\d{7,15}$/.test(whatsApp.replace(/[\s\-]/g, ''))) {
        alert('Please enter a valid WhatsApp number (7–15 digits, optionally starting with +).');
        document.getElementById('whatsAppNumber')?.focus();
        return;
    }
    if (bio.length > 1000) {
        alert('Bio must be 1000 characters or fewer.');
        return;
    }

    const btn = document.querySelector('#edit-profile-form button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

    try {
        await apiJSON('/api/Freelancers/profile', {
            method: 'PUT',
            body: JSON.stringify({ city, bio, phone: whatsApp || null })
        });

        if (whatsApp) localStorage.setItem('whatsAppNumber', whatsApp);

        const fileInput = document.getElementById('profile-picture');
        if (fileInput?.files[0]) {
            const fd = new FormData();
            fd.append('file', fileInput.files[0]);
            await apiFetch('/api/Freelancers/profile-image', {
                method: 'POST', body: fd, isMultipart: true,
            });
        }

        invalidateProfileCache();
        alert('Profile saved successfully!');
        window.location.href = 'freelancer.html';
    } catch (err) {
        alert('Failed to save profile: ' + err.message);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
    }
}

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

    // ── 1. Profile (prefer session cache set by ensureFreelancerProfile) ───────
    let profile = null;
    try {
        const raw = sessionStorage.getItem('__fp_data');
        if (raw) profile = JSON.parse(raw);
    } catch { /* cache miss */ }

    if (!profile) {
        try {
            profile = await apiJSON('/api/Freelancers/profile/me');
        } catch (err) {
            console.error('[FL] Profile fetch failed:', err.message);
            _setText('fullName', user.fullName || '');
            return;
        }
    }

    // ── 2. Populate sidebar profile card ──────────────────────────────────────
    const displayName = profile.fullName || user.fullName || '';
    _setText('fullName',            displayName);
    _setText('profession',          profile.profession  || '');
    _setText('address',             profile.city        || '');
    _setText('experienceYears',     profile.experienceYears != null ? String(profile.experienceYears) : '—');
    _setText('profile-description', profile.bio         || 'No bio yet. Click Edit Profile to add one.');
    _setText('emailDisplay',        profile.email       || user.email || '');

    // Phone / WhatsApp
    const phone = profile.phone || '';
    if (phone) localStorage.setItem('whatsAppNumber', phone);
    _setText('phoneNumber', phone || '—');

    // Profile picture — resolve relative path to absolute URL, fallback to avatar API
    const pic = document.getElementById('profilePicture');
    if (pic) {
        pic.src = _resolveAvatar(profile.profileImageUrl, displayName);
        pic.onerror = () => {
            pic.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0D8ABC&color=fff`;
        };
    }

    // Rating from profile
    if (profile.averageRating != null) {
        _setText('avg-rating', `${Number(profile.averageRating).toFixed(1)}/5`);
    }

    // ── 3. Orders — fetch and render on dashboard ──────────────────────────────
    const orders = await _loadDashboardOrders();

    // ── 4. Stats computed from live order data ─────────────────────────────────
    const completed = orders.filter(o => _normaliseStatus(o.status) === 'completed');
    const earnings  = completed.reduce((sum, o) => sum + (Number(o.servicePriceSnapshot) || 0), 0);

    _setText('completed-count', String(completed.length));
    _setText('total-earnings',  `$${earnings.toFixed(0)}`);

    // ── 5. Services list ───────────────────────────────────────────────────────
    try {
        const services = await apiJSON('/api/Freelancers/my-services');
        renderServicesList(Array.isArray(services) ? services : []);
    } catch (err) {
        console.error('[FL] Services fetch failed:', err.message);
        renderServicesList([]);
    }
}

// ── Fetch orders and render the Active Orders section ────────────────────────
async function _loadDashboardOrders() {
    const container = document.getElementById('orders-container');
    if (!container) return [];

    try {
        const data   = await apiJSON('/api/Orders/freelancer?pageNumber=1&pageSize=10');
        const orders = Array.isArray(data) ? data : (data.data ?? data.items ?? []);

        if (!orders.length) {
            container.innerHTML = `
                <div class="empty-hint">
                    <i class="fas fa-clipboard" style="font-size:2rem;color:#c8d0db;display:block;margin-bottom:.5rem;"></i>
                    No orders yet. Share your services to start receiving orders!
                </div>`;
            return [];
        }

        container.innerHTML = orders.map(o => _renderDashboardOrderCard(o)).join('');
        return orders;

    } catch (err) {
        container.innerHTML = `<p class="err-hint">Failed to load orders: ${_esc(err.message)}</p>`;
        return [];
    }
}

function _renderDashboardOrderCard(o) {
    const statusKey  = _normaliseStatus(o.status);
    const statusLabel = _orderStatusLabel(o.status);
    const isPending  = statusKey === 'pending';
    const isAccepted = statusKey === 'accepted';

    const oid   = o.orderID ?? o.id ?? '—';
    const title = o.serviceTitle ? _esc(o.serviceTitle) : `Order #${oid}`;
    const price = o.servicePriceSnapshot > 0
        ? `$${Number(o.servicePriceSnapshot).toFixed(2)}`
        : '';

    // WhatsApp link for contacting the client
    const clientPhone   = (o.clientPhone || '').replace(/\D/g, '');
    const clientName    = _esc(o.clientName || 'Client');
    const whatsappHref  = clientPhone
        ? `https://wa.me/${clientPhone}?text=${encodeURIComponent(`Hello ${o.clientName || 'there'}! Regarding your order on Sana'a.`)}`
        : null;

    const whatsappBtn = whatsappHref
        ? `<a href="${whatsappHref}" target="_blank" rel="noopener noreferrer"
              class="btn-xs btn-whatsapp-sm">
               <i class="fab fa-whatsapp"></i> Contact Client
           </a>`
        : '';

    const actionBtns = (isPending || isAccepted) ? `
        <div class="order-actions">
            ${isPending ? `
                <button class="btn-xs btn-accept"  onclick="respondToOrder(${oid}, ${ORDER_STATUS.Accepted})">
                    <i class="fas fa-check"></i> Accept
                </button>
                <button class="btn-xs btn-decline" onclick="respondToOrder(${oid}, ${ORDER_STATUS.Rejected})">
                    <i class="fas fa-times"></i> Decline
                </button>` : ''}
            ${isAccepted ? `
                <button class="btn-xs btn-complete" onclick="respondToOrder(${oid}, ${ORDER_STATUS.Completed})">
                    <i class="fas fa-flag-checkered"></i> Mark Complete
                </button>` : ''}
            ${whatsappBtn}
        </div>` : whatsappBtn ? `<div class="order-actions">${whatsappBtn}</div>` : '';

    const dateStr = o.orderDate
        ? new Date(o.orderDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
        : '—';

    return `
    <div class="order-card" data-order-id="${oid}">
        <div>
            <div class="order-title">${title}</div>
            ${price ? `<div class="order-price">${price}</div>` : ''}
            <div class="order-meta">
                <span><i class="fas fa-user"></i> ${clientName}</span>
                ${o.location    ? `<span><i class="fas fa-map-marker-alt"></i> ${_esc(o.location)}</span>`    : ''}
                ${o.description ? `<span><i class="fas fa-file-alt"></i> ${_esc(o.description.slice(0, 80))}${o.description.length > 80 ? '…' : ''}</span>` : ''}
                <span><i class="fas fa-calendar-alt"></i> ${dateStr}</span>
            </div>
            ${actionBtns}
        </div>
        <div class="order-right">
            <span class="status-pill status-${statusKey}">${statusLabel}</span>
        </div>
    </div>`;
}

// Called from Accept / Decline / Mark Complete buttons
window.respondToOrder = async function (orderId, status) {
    try {
        await apiJSON(`/api/Orders/${orderId}/status?status=${status}`, { method: 'PUT' });
        // Re-render the orders section only (not the whole page)
        const orders = await _loadDashboardOrders();
        // Refresh completed count + earnings in stats
        const completed = orders.filter(o => _normaliseStatus(o.status) === 'completed');
        const earnings  = completed.reduce((sum, o) => sum + (Number(o.servicePriceSnapshot) || 0), 0);
        _setText('completed-count', String(completed.length));
        _setText('total-earnings',  `$${earnings.toFixed(0)}`);
    } catch (err) {
        alert('Failed to update order: ' + err.message);
    }
};

// services: FreelancerServiceDto[] or string[]
function renderServicesList(services) {
    const container = document.getElementById('services-list');
    if (!container) return;

    if (!services?.length) {
        container.innerHTML = `
            <div class="empty-hint">
                No services yet.
                <a href="FL-post-service.html" style="color:var(--accent);">Post your first service!</a>
            </div>`;
        return;
    }

    container.innerHTML = services.map(s => {
        const title  = typeof s === 'string' ? s           : _esc(s.title ?? 'Untitled');
        const price  = typeof s === 'string' ? ''          : `$${Number(s.basePrice).toFixed(2)}`;
        const active = typeof s === 'string' ? true        : s.isActive;
        return `
        <div class="service-row">
            <span class="service-row-name${!active ? ' inactive' : ''}">${title}</span>
            <div class="service-row-right">
                ${price ? `<span class="service-price">${price}</span>` : ''}
                <span class="service-badge ${active ? 'badge-active' : 'badge-inactive'}">
                    ${active ? 'Active' : 'Inactive'}
                </span>
            </div>
        </div>`;
    }).join('');
}

// WhatsApp button in sidebar (freelancer's own number)
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

window.toggleServiceStatus = async function (checkbox) {
    const id          = parseInt(checkbox.dataset.serviceId);
    const newIsActive = checkbox.checked;
    const label       = checkbox.closest('.service-toggle-area')?.querySelector('.toggle-label');

    checkbox.disabled = true;
    try {
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
        checkbox.checked = !newIsActive;
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
        const orders = Array.isArray(data) ? data : (data.data ?? data.items ?? []);

        if (!orders.length) {
            container.innerHTML = '<p>No orders yet.</p>';
            return;
        }

        container.innerHTML = orders.map(o => {
            const oid      = o.orderID ?? o.id;
            const statusKey = _normaliseStatus(o.status);
            const isPending = statusKey === 'pending';
            return `
            <div class="order-item">
                <div class="order-info">
                    <h4>Order #${oid}${o.serviceTitle ? ` — ${_esc(o.serviceTitle)}` : ''}</h4>
                    <p>${_esc(o.description || 'No description provided')}</p>
                    ${o.clientName ? `<p><i class="fas fa-user"></i> ${_esc(o.clientName)}</p>` : ''}
                    <p><i class="fas fa-map-marker-alt"></i> ${_esc(o.location || '—')}</p>
                    <span class="status-badge">${_orderStatusLabel(o.status)}</span>
                </div>
                ${isPending ? `
                <div class="order-actions" style="margin-top:0.75rem;display:flex;gap:0.5rem;">
                    <button class="btn btn-primary" onclick="respondToOrder(${oid}, ${ORDER_STATUS.Accepted})">
                        <i class="fas fa-check"></i> Accept
                    </button>
                    <button class="btn btn-secondary" onclick="respondToOrder(${oid}, ${ORDER_STATUS.Rejected})">
                        <i class="fas fa-times"></i> Decline
                    </button>
                </div>` : ''}
            </div>`;
        }).join('');

    } catch (err) {
        container.innerHTML = `<p style="color:red">Failed to load orders: ${_esc(err.message)}</p>`;
    }
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
        dropdown.querySelectorAll('.notif-item.unread, .notification-item.unread')
            .forEach(el => el.classList.remove('unread'));
        if (countEl) { countEl.textContent = '0'; countEl.style.display = 'none'; }
        dropdown.classList.remove('active');
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

// Resolve a relative media path to an absolute URL, falling back to ui-avatars.
function _resolveAvatar(imageUrl, name) {
    if (imageUrl) {
        const resolved = resolveMediaUrl(imageUrl);
        if (resolved) return resolved;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'FL')}&background=0D8ABC&color=fff`;
}

// Normalise status to lowercase string for CSS class and comparisons.
// Backend sends o.Status.ToString() → "Pending", "Accepted", "Rejected", "Completed"
// but legacy endpoints may still send integers.
function _normaliseStatus(status) {
    if (typeof status === 'number') {
        return ({ 0: 'pending', 1: 'accepted', 2: 'rejected', 3: 'completed' }[status]) ?? 'unknown';
    }
    return String(status ?? '').toLowerCase();
}

function _orderStatusLabel(status) {
    const key = _normaliseStatus(status);
    return { pending: 'Pending', accepted: 'Accepted', rejected: 'Rejected', completed: 'Completed' }[key]
        ?? String(status ?? 'Unknown');
}

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
