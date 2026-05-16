/**
 * page-freelancerJS.js — Public Freelancer Profile (ES Module)
 * Loaded by page-freelancer.html
 *
 * Reads ?id=<userId> from the URL to fetch the correct profile.
 * If the logged-in user IS the profile owner, service cards include
 * an ON/OFF toggle so they can activate/deactivate services without
 * navigating to FL-manage-services.html.
 *
 * API:
 *   GET /api/Freelancers/{userId}   → FreelancerProfileResponse
 *   GET /api/Services               → Service[] (full objects with IDs)
 *   PUT /api/Services/{id}          → UpdateServiceRequest { isActive, ... }
 */

import { apiJSON } from './api.js';
import { getCurrentUser } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {

    // ── Determine which freelancer to display ─────────────────────────────────
    const params    = new URLSearchParams(location.search);
    const userId    = params.get('id') ? parseInt(params.get('id')) : null;
    const viewer    = getCurrentUser(); // null if not logged in

    if (userId) {
        await loadFreelancerProfile(userId, viewer);
    }

    // ── Wire WhatsApp button ──────────────────────────────────────────────────
    const whatsappBtn = document.querySelector('.whatsapp-button .btn');
    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', () => _openWhatsApp());
    }

    // ── Report modal (keep original logic) ───────────────────────────────────
    initReportSystem();

    // ── Notifications dropdown ────────────────────────────────────────────────
    initNotifications();

    // ── Keyboard: close modal on Escape ───────────────────────────────────────
    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        const overlay = document.querySelector('.modal-overlay');
        if (overlay?.style.display === 'flex') {
            overlay.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE LOADING
// ═══════════════════════════════════════════════════════════════════════════════

async function loadFreelancerProfile(userId, viewer) {
    try {
        // FreelancerProfileResponse fields (camelCase):
        // userID, fullName, profession, bio, city, availabilityStatus,
        // averageRating, profileImageUrl, services: string[], approvalStatus
        const profile = await apiJSON(`/api/Freelancers/${userId}`);

        populateProfileCard(profile);
        populateStats(profile);
        populateCommunication(profile);
        populateAvailability(profile);

        // Determine if viewer is the profile owner
        const isOwner = viewer &&
            (viewer.role === 'freelancer') &&
            (viewer.email === profile.email);

        await populateServices(profile, isOwner);

    } catch (err) {
        console.error('Profile load error:', err);
        _showToast('Could not load this freelancer\'s profile.', 4000);
    }
}

function populateProfileCard(profile) {
    const card = document.querySelector('.profile-card');
    if (!card) return;

    const h2 = card.querySelector('h2');
    if (h2) h2.textContent = profile.fullName || '';

    const prof = card.querySelector('.profession');
    if (prof) prof.textContent = profile.profession || '';

    // Location line (first <p> in .profile-info)
    const locP = card.querySelector('.profile-info p');
    if (locP) locP.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${_esc(profile.city || '—')}`;

    // Profile picture
    const img = card.querySelector('img.profile-pic');
    if (img && profile.profileImageUrl) img.src = profile.profileImageUrl;
}

function populateStats(profile) {
    // Average rating — first .stat-content h4
    const statH4s = document.querySelectorAll('.stat-content h4');
    if (statH4s[0] && profile.averageRating !== undefined) {
        statH4s[0].textContent = `${Number(profile.averageRating).toFixed(1)}/5`;
    }
}

function populateCommunication(profile) {
    const commCard = document.querySelector('.communication-card');
    if (!commCard) return;

    // Phone line — now sourced directly from the API
    const phoneP = commCard.querySelector('.contact-info > p');
    if (phoneP) {
        phoneP.textContent = profile.phone
            ? `WhatsApp: ${profile.phone}`
            : (profile.email ? `Email: ${profile.email}` : '');
    }

    // Store for WhatsApp button and page-level usage
    window._profilePhone = profile.phone || '';
    window._profileEmail = profile.email || '';
    window._profileName  = profile.fullName || '';

    // Bio / About Me
    const bioP = commCard.querySelector('.about-section p');
    if (bioP) bioP.textContent = profile.bio || 'No bio provided yet.';
}

function populateAvailability(profile) {
    const dot    = document.querySelector('.status-dot');
    const h4     = document.querySelector('.availability-status h4');
    const isAvail = (profile.availabilityStatus || '').toLowerCase() === 'available';

    if (dot) {
        dot.className = `status-dot ${isAvail ? 'available' : 'busy'}`;
    }
    if (h4) h4.textContent = isAvail ? 'Available Now' : 'Currently Busy';
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICES GRID
// ═══════════════════════════════════════════════════════════════════════════════

// profile: FreelancerProfileResponse  |  isOwner: boolean
async function populateServices(profile, isOwner) {
    const grid = document.querySelector('.services-grid');
    if (!grid) return;

    grid.innerHTML = '<p class="empty-msg" style="text-align:center;padding:1rem">جاري التحميل…</p>';

    try {
        // Use the new public endpoint — returns full FreelancerServiceDto objects
        const services = await apiJSON(`/api/Freelancers/${profile.userID}/services`);

        if (!services?.length) {
            grid.innerHTML = '<p class="empty-msg">No active services listed yet.</p>';
            return;
        }

        // Render cards with prices; owners also get an ON/OFF toggle
        grid.innerHTML = services.map(s => _renderServiceCard(s, isOwner)).join('');

    } catch (err) {
        console.error('Services load error:', err);
        // Graceful fallback: render the plain service title strings from the profile
        const names = profile.services || [];
        if (!names.length) {
            grid.innerHTML = '<p class="empty-msg">No services listed yet.</p>';
            return;
        }
        grid.innerHTML = names.map(name => `
            <div class="service-card">
                <i class="fas fa-briefcase service-icon"></i>
                <h3>${_esc(name)}</h3>
            </div>`).join('');
    }
}

function _renderServiceCard(s, showToggle) {
    const id = s.serviceID ?? s.id;
    return `
    <div class="service-card" data-service-id="${id}">
        <i class="fas fa-briefcase service-icon"></i>
        <h3>${_esc(s.title)}</h3>
        <p>${_esc(s.description || '')}</p>
        <div class="service-footer" style="margin-top:0.75rem;display:flex;justify-content:space-between;align-items:center;">
            <span class="price" style="font-weight:600">$${Number(s.basePrice).toFixed(2)}</span>
            ${showToggle ? `
            <label class="toggle-switch" title="${s.isActive ? 'Deactivate' : 'Activate'}">
                <input type="checkbox"
                       ${s.isActive ? 'checked' : ''}
                       data-service-id="${id}"
                       data-title="${_esc(s.title)}"
                       data-description="${_esc(s.description || '')}"
                       data-price="${s.basePrice}"
                       data-category="${s.categoryID ?? ''}"
                       onchange="toggleServiceStatus(this)">
                <span class="toggle-slider"></span>
            </label>` : ''}
        </div>
    </div>`;
}

/**
 * toggleServiceStatus — activate / deactivate a service from the public profile.
 * Only reachable when the viewer is the profile owner (isOwner === true).
 * Mirrors the same function in FreelancerJS.js — data-* attrs avoid extra GETs.
 */
window.toggleServiceStatus = async function (checkbox) {
    const id          = parseInt(checkbox.dataset.serviceId);
    const newIsActive = checkbox.checked;

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
        // Update the card's visual state
        const card = checkbox.closest('.service-card');
        if (card) card.classList.toggle('service-inactive', !newIsActive);
        _showToast(newIsActive ? 'Service activated.' : 'Service deactivated.', 2500);
    } catch (err) {
        checkbox.checked = !newIsActive; // revert on failure
        _showToast('Failed to update: ' + err.message, 3000);
    } finally {
        checkbox.disabled = false;
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// WHATSAPP
// ═══════════════════════════════════════════════════════════════════════════════

function _openWhatsApp() {
    // Use phone from the API response (stored in window._profilePhone by populateCommunication)
    const number  = window._profilePhone || localStorage.getItem('whatsAppNumber') || '';
    const name    = window._profileName || 'the freelancer';
    const message = encodeURIComponent(
        `Hello ${name}! I found your profile on Sana'a and would like to discuss a project.`
    );

    if (number) {
        window.open(`https://wa.me/${number.replace(/\D/g, '')}?text=${message}`, '_blank');
    } else {
        // No phone stored — fallback to a WhatsApp app open (user selects contact)
        window.open(`https://wa.me/?text=${message}`, '_blank');
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function initReportSystem() {
    const modalOverlay = document.createElement('div');
    modalOverlay.className    = 'modal-overlay';
    modalOverlay.style.display = 'none';
    document.body.appendChild(modalOverlay);

    modalOverlay.innerHTML = `
        <div class="modal-content fullscreen-modal">
            <button class="modal-close" aria-label="Close">&times;</button>
            <h3 class="modal-title">Report Profile</h3>
            <form id="reportForm" class="report-form">
                <div class="form-group">
                    <label for="reportReason" class="form-label">Reason for Reporting</label>
                    <select id="reportReason" class="form-select" required>
                        <option value="" disabled selected>Select a reason</option>
                        <option value="spam">Spam or Fake Profile</option>
                        <option value="behavior">Inappropriate Behavior</option>
                        <option value="content">Inappropriate Content</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div class="form-group" id="customReason" style="display:none">
                    <label for="reportDetails" class="form-label">Additional Details</label>
                    <textarea id="reportDetails" class="form-textarea" rows="8"
                              maxlength="500" placeholder="Provide more details (optional)"></textarea>
                    <small class="char-count">0/500 characters</small>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">Submit Report</button>
                </div>
            </form>
        </div>`;

    const closeModal = () => {
        modalOverlay.style.display    = 'none';
        document.body.style.overflow  = 'auto';
    };

    document.querySelector('.report-btn')?.addEventListener('click', () => {
        modalOverlay.style.display   = 'flex';
        document.body.style.overflow = 'hidden';
    });

    modalOverlay.querySelector('.modal-close').addEventListener('click', closeModal);
    modalOverlay.querySelector('.btn-secondary').addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

    const reasonSelect  = modalOverlay.querySelector('#reportReason');
    const customSection = modalOverlay.querySelector('#customReason');
    const detailsTA     = modalOverlay.querySelector('#reportDetails');
    const charCount     = modalOverlay.querySelector('.char-count');

    reasonSelect.addEventListener('change', e => {
        customSection.style.display = e.target.value === 'other' ? 'block' : 'none';
    });

    detailsTA.addEventListener('input', () => {
        charCount.textContent = `${detailsTA.value.length}/500 characters`;
    });

    modalOverlay.querySelector('#reportForm').addEventListener('submit', e => {
        e.preventDefault();
        if (!reasonSelect.value) { _showToast('Please select a reason.', 2000); return; }
        closeModal();
        _showToast('Report submitted successfully. Thank you!', 3000);
    });
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

function _showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.cssText =
        'position:fixed;bottom:1.5rem;right:1.5rem;background:#2c3e50;color:#fff;' +
        'padding:0.75rem 1.25rem;border-radius:8px;font-size:0.9rem;z-index:9999;' +
        'box-shadow:0 4px 12px rgba(0,0,0,0.2);display:flex;align-items:center;gap:0.75rem;';
    toast.innerHTML = `
        <span>${_esc(message)}</span>
        <button onclick="this.parentElement.remove()"
                style="background:none;border:none;color:#fff;font-size:1rem;cursor:pointer;padding:0;">
            &times;
        </button>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
}

function _esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
