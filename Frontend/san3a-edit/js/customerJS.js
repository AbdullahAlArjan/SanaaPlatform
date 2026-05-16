import { requireAuth } from './auth.js';
import { apiJSON, apiFetch } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Guard: must be a logged-in client
    const user = requireAuth(['client']);
    if (!user) return;

    // ── 1. Name from stored JWT data ──────────────────────────────────────────
    const nameEl = document.getElementById('fullName');
    if (nameEl) nameEl.textContent = user.fullName ?? '';

    // ── 2. Profile fields from localStorage ───────────────────────────────────
    // TODO: replace with GET /api/Users/me once that endpoint is added to UsersController
    _setDisplay('phoneDisplay',    localStorage.getItem('phoneNumber') || '');
    _setDisplay('birthdayDisplay', localStorage.getItem('birthday')    || '');
    _setDisplay('genderDisplay',   localStorage.getItem('gender')      || '');
    _setDisplay('cityDisplay',     localStorage.getItem('city')        || '');

    // ── 3. Restore saved avatar ───────────────────────────────────────────────
    const savedAvatar = localStorage.getItem('profileImage');
    const profileImg  = document.getElementById('profileImage');
    if (savedAvatar && profileImg) profileImg.src = savedAvatar;

    // ── 4. Avatar upload ──────────────────────────────────────────────────────
    const avatarUpload = document.getElementById('avatarUpload');
    if (avatarUpload) {
        avatarUpload.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function (ev) {
                if (profileImg) profileImg.src = ev.target.result;
                localStorage.setItem('profileImage', ev.target.result);
            };
            reader.readAsDataURL(file);
        });
    }

    // ── 5. Load live data in parallel ────────────────────────────────────────
    loadNotifications();
    await Promise.all([loadFavoriteServices(), loadPurchasedServices()]);
});

// ── Shared helpers ────────────────────────────────────────────────────────────

function _setDisplay(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function _setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}

// ── Profile Editor Modal ──────────────────────────────────────────────────────
// Exposed on window so HTML onclick="" attributes can reach them from a module

window.openProfileEditor = function () {
    const modal = document.getElementById('profileEditorModal');
    if (!modal) return;
    modal.style.display = 'flex';
    _setVal('genderInput',   localStorage.getItem('gender')      || '');
    _setVal('phoneInput',    localStorage.getItem('phoneNumber') || '');
    _setVal('cityInput',     localStorage.getItem('city')        || '');
    _setVal('birthdayInput', localStorage.getItem('birthday')    || '');
};

window.saveProfileChanges = async function () {
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

    // Persist to localStorage
    if (birthday) localStorage.setItem('birthday',    birthday);
    if (gender)   localStorage.setItem('gender',      gender);
    if (phone)    localStorage.setItem('phoneNumber', phone);
    if (city)     localStorage.setItem('city',        city);

    // Reflect immediately in the display
    if (birthday) _setDisplay('birthdayDisplay', birthday);
    if (gender)   _setDisplay('genderDisplay',   gender);
    if (phone)    _setDisplay('phoneDisplay',    phone);
    if (city)     _setDisplay('cityDisplay',     city);

    // TODO: uncomment once PATCH /api/Users/me is added to UsersController
    // try {
    //   await apiJSON('/api/Users/me', {
    //     method: 'PATCH',
    //     body: JSON.stringify({ phone, city, gender, birthday }),
    //   });
    // } catch (err) { console.error('Profile save failed:', err); }

    alert('Profile changes saved!');
    window.closeModal('profileEditorModal');
};

window.closeModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
};

// ── Notifications ─────────────────────────────────────────────────────────────

window.toggleNotifications = function () {
    const dropdown = document.getElementById('notificationsDropdown');
    if (dropdown) dropdown.classList.toggle('active');
};

function loadNotifications() {
    // Static placeholder — replace with GET /api/Notifications when that endpoint exists
    const list = document.getElementById('notificationsList');
    if (!list) return;
    const items = [
        { icon: 'fa-envelope',     message: 'You have a new message' },
        { icon: 'fa-check-circle', message: 'Your service request was approved' },
        { icon: 'fa-bell',         message: 'New service available: Graphic Design' },
    ];
    list.innerHTML = items.map(n => `
        <div class="notification">
            <i class="fas ${n.icon}"></i>
            <span>${n.message}</span>
        </div>`).join('');
}

// ── Favorite Services — GET /api/Favorites ────────────────────────────────────
// DTO (FavoriteServiceResponse): ServiceID, Title, Description, BasePrice, SavedAt

async function loadFavoriteServices() {
    const container = document.getElementById('favoriteServicesContainer');
    if (!container) return;

    container.innerHTML = '<p class="loading-text">جاري التحميل...</p>';
    try {
        const data = await apiJSON('/api/Favorites');

        // API returns camelCase: title, description, basePrice, serviceID
        if (!Array.isArray(data) || data.length === 0) {
            container.innerHTML = '<p class="empty-msg">You have no favorite services yet. Start exploring!</p>';
            return;
        }

        container.innerHTML = data.map(fav => `
            <div class="service-card">
                <div class="service-content">
                    <h3>${fav.title || 'Untitled Service'}</h3>
                    <p class="service-provider">${fav.description || ''}</p>
                    <div class="service-footer">
                        ${fav.basePrice != null
                            ? `<span class="price">$${Number(fav.basePrice).toFixed(2)}</span>`
                            : ''}
                        <button class="action-btn remove-fav-btn"
                                onclick="removeFavorite(${fav.serviceID})">
                            <i class="fas fa-heart-broken"></i> Remove
                        </button>
                    </div>
                </div>
            </div>`).join('');
    } catch (err) {
        console.error('Favorites load error:', err);
        container.innerHTML = '<p class="error-msg">Failed to load favorites.</p>';
    }
}

window.removeFavorite = async function (serviceId) {
    if (!confirm('Remove this service from favorites?')) return;
    try {
        const res = await apiFetch(`/api/Favorites/${serviceId}`, { method: 'DELETE' });
        if (res.ok) {
            await loadFavoriteServices();
        } else {
            alert('Could not remove from favorites.');
        }
    } catch {
        alert('Failed to remove from favorites.');
    }
};

// ── Purchased Services — GET /api/Orders/my-orders ────────────────────────────
// OrderStatus enum: 0=Pending, 1=Accepted, 2=Completed, 3=Cancelled

async function loadPurchasedServices() {
    const container = document.getElementById('purchasedServicesContainer');
    if (!container) return;

    container.innerHTML = '<p class="loading-text">جاري التحميل...</p>';
    try {
        // Backend returns PagedResponse<OrderResponse>: { data:[…], totalCount, pageNumber, pageSize }
        // Increase pageSize so all recent orders are visible without pagination UI
        const response = await apiJSON('/api/Orders/my-orders?pageNumber=1&pageSize=50');
        const orders   = Array.isArray(response) ? response : (response?.data ?? []);

        if (orders.length === 0) {
            container.innerHTML = '<p class="empty-msg">You have no purchased services yet.</p>';
            return;
        }

        container.innerHTML = orders.map(order => {
            // "Report Issue" button is only shown for Completed orders
            // (OrderStatus.Completed is the post-payment state — equivalent to "Paid")
            const isCompleted = (order.status || '').toLowerCase() === 'completed';
            // Use generic report page params: targetType=Freelancer, targetId=freelancerID
            const reportBtn   = isCompleted && order.freelancerID
                ? `<a href="report.html?targetType=Freelancer&targetId=${order.freelancerID}"
                       class="action-btn report-issue-btn"
                       style="background:#e74c3c;text-decoration:none;font-size:0.8rem;padding:0.4rem 0.75rem;">
                       <i class="fas fa-flag"></i> Report Issue
                   </a>`
                : '';

            return `
            <div class="service-card">
                <div class="service-info">
                    <h4>Order #${order.orderID ?? 'N/A'}</h4>
                    ${order.freelancerName
                        ? `<p><strong>Freelancer:</strong> ${order.freelancerName}</p>`
                        : ''}
                    <p><strong>Description:</strong> ${order.description || '—'}</p>
                    <p><strong>Location:</strong>    ${order.location    || '—'}</p>
                    <p><strong>Date:</strong>        ${order.orderDate
                        ? new Date(order.orderDate).toLocaleDateString()
                        : '—'}</p>
                    <div class="service-footer">
                        <span class="status-badge status-${(order.status || '').toLowerCase()}">
                            ${_statusLabel(order.status)}
                        </span>
                        ${reportBtn}
                    </div>
                </div>
            </div>`;
        }).join('');
    } catch (err) {
        console.error('Orders load error:', err);
        // 404 means the user has no orders yet — show empty state, not an error
        const is404 = err?.message?.includes('404') || err?.message?.toLowerCase().includes('not found');
        container.innerHTML = is404
            ? '<p class="empty-msg">You have no purchased services yet.</p>'
            : '<p class="error-msg">Failed to load orders. Please try again.</p>';
    }
}

function _statusLabel(status) {
    // Backend sends Status as a string enum: "Pending", "Accepted", "Completed", "Rejected"
    const map = {
        pending:   'Pending',
        accepted:  'Accepted',
        completed: 'Completed',
        rejected:  'Rejected',
        cancelled: 'Cancelled',
    };
    return map[(status || '').toLowerCase()] ?? status ?? 'Pending';
}
