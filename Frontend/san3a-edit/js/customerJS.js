import { requireAuth } from './auth.js';
import { apiJSON, apiFetch } from './api.js';

// ── Entry Point ───────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    const user = requireAuth(['client']);
    if (!user) return;

    // Avatar: restore from cache + wire upload
    const profileImg   = document.getElementById('profileImage');
    const avatarUpload = document.getElementById('avatarUpload');
    const cachedAvatar = localStorage.getItem('profileImage');
    if (cachedAvatar && profileImg) profileImg.src = cachedAvatar;

    if (avatarUpload) {
        avatarUpload.addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                if (profileImg) profileImg.src = ev.target.result;
                localStorage.setItem('profileImage', ev.target.result);
            };
            reader.readAsDataURL(file);
        });
    }

    // Tab system
    document.querySelectorAll('.workspace-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => _activateTab(btn.dataset.tab));
    });

    // Load all data in parallel.
    // Profile uses the JWT user object directly — no API call needed because
    // /api/users/profile does not exist; UsersController only exposes /api/users (admin).
    loadNotifications();
    loadUserProfileContext(user);

    const [orders, favs] = await Promise.all([
        fetchPurchasedOrders(),
        fetchBookmarkedFavorites(),
    ]);

    _populateDashboardComponents(orders, favs);
});

// ── Tab System ────────────────────────────────────────────────────────────────

function _activateTab(tabId) {
    document.querySelectorAll('.workspace-tab-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.tab === tabId));
    document.querySelectorAll('.tab-pane').forEach(p =>
        p.classList.toggle('active', p.id === 'tab-' + tabId));
}

window.switchTab = _activateTab;

// ── Profile — sourced from the JWT user object + localStorage ────────────────
// /api/users/profile does not exist in the backend (UsersController only has
// GET /api/users for admin use).  All the data we need is already available:
//   • name / fullName   → JWT claims stored by auth.js on login
//   • phone, birthday,
//     gender, city      → localStorage keys written by saveProfileChanges()
// This is synchronous and instant — no 404, no spinner.

function loadUserProfileContext(user) {
    const name = user?.fullName ?? user?.name ?? user?.email ?? 'Valued Client';
    _setText('fullName',    name);
    _setText('sidebarName', name);

    _setText('phoneDisplay',    localStorage.getItem('phoneNumber') || '—');
    _setText('birthdayDisplay', localStorage.getItem('birthday')    || '—');
    _setText('genderDisplay',   localStorage.getItem('gender')      || '—');
    _setText('cityDisplay',     localStorage.getItem('city')        || '—');
}

// ── Purchased Orders — GET /api/Orders/my-orders ─────────────────────────────
// Correct endpoint confirmed in OrdersController.cs:
//   [HttpGet("my-orders")]  → GET /api/Orders/my-orders?pageNumber=1&pageSize=50
// Returns PagedResponse<OrderResponse>: { data: [...], totalCount, pageNumber, pageSize }
// There is no POST /api/Orders/my-purchased-services endpoint.

async function fetchPurchasedOrders() {
    const container = document.getElementById('purchasedServicesContainer');
    if (!container) return [];

    container.innerHTML = _loadingHTML('Loading your orders…');

    try {
        const response = await apiJSON('/api/Orders/my-orders?pageNumber=1&pageSize=50');

        const orders = Array.isArray(response)
            ? response
            : (response?.data || response?.items || []);

        if (!orders.length) {
            container.innerHTML = _emptyStateHTML('fa-receipt', 'No orders yet. Start by booking a service!');
            return [];
        }

        container.innerHTML = orders.map(_renderOrderCard).join('');
        return orders;

    } catch (err) {
        console.error('[customerJS] Orders fetch error:', err);
        const is404 = err?.message?.includes('404') ||
                      err?.message?.toLowerCase().includes('not found');
        container.innerHTML = is404
            ? _emptyStateHTML('fa-receipt', 'No orders yet. Start by booking a service!')
            : _errorHTML('Could not load orders. Please refresh and try again.');
        return [];
    }
}

function _renderOrderCard(order) {
    const statusKey   = _normaliseStatus(order.status);
    const isCompleted = statusKey === 'completed' || statusKey === 'paid';

    const reportBtn = isCompleted && order.freelancerID
        ? `<a href="report.html?targetType=Freelancer&targetId=${order.freelancerID}"
               class="btn-action btn-warning"
               style="text-decoration:none;">
               <i class="fas fa-flag"></i> Report Issue
           </a>`
        : '';

    const price = order.price != null
        ? `$${Number(order.price).toFixed(2)}`
        : (order.basePrice != null ? `$${Number(order.basePrice).toFixed(2)}` : '');

    const rawDate = order.createdAt ?? order.orderDate ?? null;
    const date    = rawDate ? new Date(rawDate).toLocaleDateString() : '—';

    return `
    <div class="service-card">
        <h4>${_esc(order.serviceTitle ?? order.title ?? `Order #${order.orderID ?? 'N/A'}`)}</h4>
        <div class="card-meta">
            ${order.freelancerName
                ? `<span><i class="fas fa-user-tie"></i>${_esc(order.freelancerName)}</span>`
                : ''}
            ${price ? `<span><i class="fas fa-tag"></i>${price}</span>` : ''}
            <span><i class="fas fa-calendar-alt"></i>${date}</span>
        </div>
        <div class="card-footer">
            <span class="status-pill-badge status-${statusKey}">
                ${_statusLabel(order.status)}
            </span>
            ${reportBtn}
        </div>
    </div>`;
}

// ── Bookmarked Favorites — GET /api/Favorites ────────────────────────────────
// Correct endpoint confirmed in FavoritesController.cs:
//   [HttpGet]  → GET /api/Favorites   (returns flat array of FavoriteResponse)
// There is no POST /api/Favorites/my-favorites endpoint.
// Response is a flat array — no pagination wrapper.

async function fetchBookmarkedFavorites() {
    const container = document.getElementById('favoriteServicesContainer');
    if (!container) return [];

    container.innerHTML = _loadingHTML('Loading your favorites…');

    const _normaliseList = response => {
        if (response == null) return [];
        const list = Array.isArray(response)
            ? response
            : (response.items || response.data || response.favorites || []);
        return Array.isArray(list) ? list : [];
    };

    let favs = [];

    try {
        const res = await apiJSON('/api/Favorites');
        favs = _normaliseList(res);
    } catch (err) {
        console.error('[customerJS] GET /api/Favorites failed:', err?.message);
        favs = [];
    }

    if (!favs.length) {
        container.innerHTML = _emptyStateHTML(
            'fa-heart',
            'No saved services yet. Browse and save something you like!'
        );
        return [];
    }

    container.innerHTML = favs.map(_renderFavCard).join('');
    return favs;
}

// data-service-id is written on the card so removeFromFavorites() can do a
// precise DOM removal without re-fetching the full list.
function _renderFavCard(fav) {
    const id   = Number(fav.serviceID ?? fav.serviceId ?? fav.id ?? 0);
    const desc = (fav.description || '').slice(0, 90) +
                 ((fav.description?.length ?? 0) > 90 ? '…' : '');

    return `
    <div class="service-card" data-service-id="${id}">
        <h4>
            <a href="service-details.html?id=${id}" style="color:inherit;text-decoration:none;">
                ${_esc(fav.title || 'Untitled Service')}
            </a>
        </h4>
        ${desc ? `<p>${_esc(desc)}</p>` : ''}
        <div class="card-footer">
            ${fav.basePrice != null
                ? `<span class="price-tag">$${Number(fav.basePrice).toFixed(2)}</span>`
                : '<span></span>'}
            <button class="btn-action btn-danger"
                    onclick="window.removeFromFavorites(${id})">
                <i class="fas fa-heart-broken"></i> Remove
            </button>
        </div>
    </div>`;
}

// ── Remove favorite: DOM-only update (no full re-fetch) ───────────────────────
// Steps:
//  1. Call DELETE /api/Favorites/{id}
//  2. Remove the matching .service-card from the DOM by data-service-id
//  3. Decrement #statFavorites counter by 1
//  4. Remove matching row from #savedServicesSummary overview widget
//  5. If the container is now empty, swap in the empty-state view
window.removeFromFavorites = async function (serviceId) {
    if (!confirm('Remove this service from your favorites?')) return;

    const numId    = Number(serviceId);
    const card     = document.querySelector(`.service-card[data-service-id="${numId}"]`);
    const container = document.getElementById('favoriteServicesContainer');

    // Dim the card immediately so the user sees feedback while the request flies
    if (card) {
        card.style.opacity        = '0.4';
        card.style.pointerEvents  = 'none';
        card.style.transition     = 'opacity 0.2s';
    }

    try {
        const res = await apiFetch(`/api/Favorites/${numId}`, { method: 'DELETE' });

        // 404 is also acceptable — the item was already gone server-side
        if (!res.ok && res.status !== 404) {
            if (card) { card.style.opacity = ''; card.style.pointerEvents = ''; }
            alert('Could not remove. Please try again.');
            return;
        }

        // ── Remove card from DOM ──────────────────────────────────────────────
        if (card) card.remove();

        // ── Decrement #statFavorites ──────────────────────────────────────────
        const statEl = document.getElementById('statFavorites');
        if (statEl) {
            const current = parseInt(statEl.textContent, 10);
            statEl.textContent = String(Math.max(0, isNaN(current) ? 0 : current - 1));
        }

        // ── Remove matching overview row ──────────────────────────────────────
        const overviewRow = document.querySelector(
            `#savedServicesSummary .widget-row[data-service-id="${numId}"]`
        );
        if (overviewRow) overviewRow.remove();

        // ── Show empty state if the grid is now empty ─────────────────────────
        if (container && !container.querySelector('.service-card')) {
            container.innerHTML = _emptyStateHTML(
                'fa-heart',
                'No saved services yet. Browse and save something you like!'
            );
        }

        // ── Show empty message in overview widget if it too is empty ──────────
        const summary = document.getElementById('savedServicesSummary');
        if (summary && !summary.querySelector('.widget-row')) {
            summary.innerHTML =
                `<p style="font-size:.82rem;color:var(--light-text);padding:.4rem 0">No saved services yet.</p>`;
        }

    } catch (err) {
        console.error('[customerJS] Remove favorite error:', err);
        if (card) { card.style.opacity = ''; card.style.pointerEvents = ''; }
        alert('Failed to remove from favorites. Please try again.');
    }
};

// ── Dashboard Stats & Overview Widgets ───────────────────────────────────────

function _populateDashboardComponents(orders, favs) {
    const total  = orders.length;
    const active = orders.filter(o =>
        ['pending', 'accepted'].includes(_normaliseStatus(o.status))).length;
    const saved  = favs.length;

    _setText('statTotalOrders',  String(total));
    _setText('statActiveOrders', String(active));
    _setText('statFavorites',    String(saved));

    _updateOverviewOrders(orders);
    _updateOverviewFavs(favs);
}

function _updateOverviewOrders(orders) {
    const container = document.getElementById('recentOrdersSummary');
    if (!container) return;

    const top3 = orders.slice(0, 3);
    if (!top3.length) {
        container.innerHTML =
            `<p style="font-size:.82rem;color:var(--light-text);padding:.4rem 0">No recent orders.</p>`;
        return;
    }

    container.innerHTML = top3.map(order => {
        const statusKey = _normaliseStatus(order.status);
        return `
        <div class="widget-row">
            <div class="widget-row-info">
                <div class="widget-row-title">
                    ${_esc(order.serviceTitle ?? order.title ?? `Order #${order.orderID ?? '—'}`)}
                </div>
                ${order.freelancerName
                    ? `<div class="widget-row-sub">${_esc(order.freelancerName)}</div>`
                    : ''}
            </div>
            <span class="status-pill-badge status-${statusKey}" style="font-size:.7rem">
                ${_statusLabel(order.status)}
            </span>
        </div>`;
    }).join('');
}

// data-service-id on each widget-row lets removeFromFavorites() surgically
// remove the matching entry without touching the rest of the overview list.
function _updateOverviewFavs(favs) {
    const container = document.getElementById('savedServicesSummary');
    if (!container) return;

    const top3 = favs.slice(0, 3);
    if (!top3.length) {
        container.innerHTML =
            `<p style="font-size:.82rem;color:var(--light-text);padding:.4rem 0">No saved services yet.</p>`;
        return;
    }

    container.innerHTML = top3.map(fav => {
        const id = Number(fav.serviceID ?? fav.serviceId ?? fav.id ?? 0);
        return `
        <div class="widget-row" data-service-id="${id}">
            <div class="widget-row-info">
                <div class="widget-row-title">${_esc(fav.title || 'Untitled')}</div>
                ${fav.basePrice != null
                    ? `<div class="widget-row-sub">$${Number(fav.basePrice).toFixed(2)}</div>`
                    : ''}
            </div>
            <a href="service-details.html?id=${id}"
               class="btn-action"
               style="background:var(--success-color);color:#fff;text-decoration:none;font-size:.72rem;padding:.25rem .65rem;">
                <i class="fas fa-arrow-right"></i>
            </a>
        </div>`;
    }).join('');
}

// ── Notifications ─────────────────────────────────────────────────────────────

window.toggleNotifications = function () {
    document.getElementById('notificationsDropdown')?.classList.toggle('open');
};

function loadNotifications() {
    const list = document.getElementById('notificationsList');
    if (!list) return;
    const items = [
        { icon: 'fa-envelope',     text: 'You have a new message' },
        { icon: 'fa-check-circle', text: 'Your service request was approved' },
        { icon: 'fa-bell',         text: 'New service available: Graphic Design' },
    ];
    list.innerHTML = items.map(n =>
        `<div class="notif-item"><i class="fas ${n.icon}"></i><span>${n.text}</span></div>`
    ).join('');
}

// ── Profile Editor Modal ──────────────────────────────────────────────────────

window.openProfileEditor = function () {
    const modal = document.getElementById('profileEditorModal');
    if (!modal) return;
    modal.classList.add('open');
    _setVal('genderInput',   localStorage.getItem('gender')      || '');
    _setVal('phoneInput',    localStorage.getItem('phoneNumber') || '');
    _setVal('cityInput',     localStorage.getItem('city')        || '');
    _setVal('birthdayInput', localStorage.getItem('birthday')    || '');
};

window.saveProfileChanges = function () {
    const phoneInput = document.getElementById('phoneInput');
    const phoneError = document.getElementById('phoneError');

    if (!/^\d{10}$/.test(phoneInput.value)) {
        phoneError.style.display = 'block';
        phoneInput.focus();
        return;
    }
    phoneError.style.display = 'none';

    const birthday = document.getElementById('birthdayInput').value;
    const gender   = document.getElementById('genderInput').value;
    const phone    = phoneInput.value;
    const city     = document.getElementById('cityInput').value;

    if (birthday) { localStorage.setItem('birthday',    birthday); _setText('birthdayDisplay', birthday); }
    if (gender)   { localStorage.setItem('gender',      gender);   _setText('genderDisplay',   gender);   }
    if (phone)    { localStorage.setItem('phoneNumber', phone);    _setText('phoneDisplay',    phone);    }
    if (city)     { localStorage.setItem('city',        city);     _setText('cityDisplay',     city);     }

    alert('Profile changes saved!');
    window.closeModal('profileEditorModal');
};

window.closeModal = function (modalId) {
    document.getElementById(modalId)?.classList.remove('open');
};

// ── Private Utilities ─────────────────────────────────────────────────────────

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

function _normaliseStatus(status) {
    return (status ?? '').toLowerCase().replace(/\s+/g, '');
}

function _statusLabel(status) {
    const map = {
        pending:   'Pending',
        accepted:  'Accepted',
        completed: 'Completed',
        paid:      'Paid',
        rejected:  'Rejected',
        cancelled: 'Cancelled',
    };
    return map[_normaliseStatus(status)] ?? String(status ?? 'Pending');
}

function _loadingHTML(msg) {
    return `<p class="loading-hint"><i class="fas fa-spinner fa-spin"></i> ${msg}</p>`;
}

function _emptyStateHTML(icon, msg) {
    return `
        <div class="empty-state">
            <i class="fas ${icon}"></i>
            <p>${msg}</p>
            <a href="index.html" class="btn-explore-green">
                Browse Services <i class="fas fa-arrow-right"></i>
            </a>
        </div>`;
}

function _errorHTML(msg) {
    return `
        <div class="empty-state">
            <i class="fas fa-exclamation-triangle" style="color:var(--danger-color)"></i>
            <p style="color:var(--danger-color)">${msg}</p>
        </div>`;
}
