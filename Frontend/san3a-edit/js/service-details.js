/**
 * service-details.js — Premium Service Detail Page
 *
 * Lifecycle:
 *  1.  Extract ?id= → redirect to index.html if missing
 *  2.  Fetch GET /api/Services/{id} → ServiceDetailDto
 *  3.  Build carousel from service.imageUrls (falls back to category image)
 *  4.  Hydrate sidebar: price, meta, freelancer card
 *  5.  Hydrate main: category badge, title, description
 *  6.  Wire buttons: Place Order, Favourite toggle, Message (WhatsApp), Report
 *  7.  Graceful error banner on 404 / network failure
 *
 * Carousel API (global so onclick="" attributes in HTML can reach them):
 *   carouselPrev()    — navigate to previous slide
 *   carouselNext()    — navigate to next slide
 *   goToSlide(index)  — jump to a specific slide (called from thumbnails)
 */

import { apiJSON, apiFetch, API_BASE_URL, resolveMediaUrl } from './api.js';
import { getCurrentUser, updateStoredUser }  from './auth.js';

// ── Category fallback images (matches seeded DB IDs 1–6) ─────────────────────
const CAT_IMAGES = {
    1: 'Images/logo.png',
    2: 'Images/service2.jpg',
    3: 'Images/service3.png',
    4: 'Images/seo.jpeg',
    5: 'Images/sm.png',
    6: 'Images/mb.jpeg',
};

// ── Module-level state ────────────────────────────────────────────────────────
let _slides       = [];
let _currentSlide = 0;
let _svc          = null;   // populated after fetch; used by checkout modal

// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {

    // ── 1. Parse and validate ?id= ────────────────────────────────────────────
    const params    = new URLSearchParams(location.search);
    const serviceId = parseInt(params.get('id') ?? '', 10);

    if (!serviceId || serviceId <= 0) {
        console.warn('[sd] No valid ?id= — redirecting home');
        location.href = 'index.html';
        return;
    }

    // ── 2. Fetch ──────────────────────────────────────────────────────────────
    let svc;
    try {
        svc = await apiJSON(`/api/Services/${serviceId}`);
    } catch (err) {
        _showError(_friendlyMsg(err, serviceId));
        return;
    }
    if (!svc?.serviceID) {
        _showError('Service data could not be loaded. Please try again.');
        return;
    }
    _svc = svc;   // store for modal submit handler

    // ── 3. Strip skeleton shimmer ─────────────────────────────────────────────
    document.querySelectorAll('.skeleton').forEach(el => el.classList.remove('skeleton'));

    // ── 4. Carousel ───────────────────────────────────────────────────────────
    const fallback  = CAT_IMAGES[svc.categoryID] || 'Images/logo.png';
    const imageList = svc.imageUrls?.length > 0 ? svc.imageUrls : [fallback];
    _buildCarousel(imageList);

    // ── 5. Sidebar — price card ───────────────────────────────────────────────
    _setText('service-price',        `$${Number(svc.basePrice).toFixed(2)}`);
    _setText('service-delivery',     'To be agreed');
    _setText('service-buyers',       '—');
    _setText('service-tools-display','—');

    const rating    = Number(svc.freelancerRating ?? 0);
    const fullStars = Math.round(rating);
    _setText('service-stars',     '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars));
    _setText('service-rating-val', rating > 0 ? `(${rating.toFixed(1)})` : '(—)');

    // ── 6. Sidebar — owner card ───────────────────────────────────────────────
    _setText('freelancer-name',       svc.freelancerName || 'Freelancer');
    _setText('freelancer-city',       svc.freelancerCity || '');
    _setText('freelancer-bio',        svc.freelancerBio  || '');
    _setText('freelancer-rating-mini',
        rating > 0 ? `⭐ ${rating.toFixed(1)} / 5` : '');

    const avatar = document.getElementById('freelancer-avatar');
    if (avatar) {
        avatar.src = svc.freelancerAvatarUrl
            ? resolveMediaUrl(svc.freelancerAvatarUrl)
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(svc.freelancerName || 'FL')}&background=3498db&color=fff`;
        avatar.alt = svc.freelancerName || 'Owner';
    }

    // Add verified checkmark once name is set
    const nameEl = document.getElementById('freelancer-name');
    if (nameEl && svc.freelancerName) {
        nameEl.innerHTML =
            `<i class="fas fa-check-circle verified-dot"></i> ${_esc(svc.freelancerName)}`;
    }

    // ── 7. Main content ───────────────────────────────────────────────────────
    _setText('service-category',    svc.categoryName  || 'General');
    _setText('service-title',       svc.title         || 'Untitled Service');
    _setText('service-description', svc.description   || 'No description provided.');

    document.title = `${svc.title} — Sana'a`;

    // ── 8. Wire action buttons ────────────────────────────────────────────────
    _wireOrderBtn(svc);
    _wireFavBtn(svc.serviceID);
    _wireMsgBtn(svc.freelancerAvatarUrl, svc.freelancerName);
    _wireReportBtn(svc.serviceID);
    _wireCheckoutModal(svc);
});

// ─────────────────────────────────────────────────────────────────────────────
// Carousel engine
// ─────────────────────────────────────────────────────────────────────────────

function _buildCarousel(urls) {
    _slides       = urls;
    _currentSlide = 0;

    const track  = document.getElementById('carousel-track');
    const thumbs = document.getElementById('carousel-thumbs');
    if (!track) return;

    // Build slides
    track.innerHTML = _slides.map((url, i) => `
        <img src="${_esc(resolveMediaUrl(url))}"
             alt="Service image ${i + 1}"
             class="carousel-slide${i === 0 ? ' active' : ''}"
             onerror="this.src='Images/logo.png'">`
    ).join('');

    // Build thumbnails (only show if > 1 image)
    if (thumbs) {
        if (_slides.length > 1) {
            thumbs.innerHTML = _slides.map((url, i) => `
                <img src="${_esc(resolveMediaUrl(url))}"
                     alt="Thumb ${i + 1}"
                     class="thumb${i === 0 ? ' active' : ''}"
                     onclick="goToSlide(${i})"
                     onerror="this.src='Images/logo.png'">`
            ).join('');
        } else {
            thumbs.style.display = 'none'; // hide empty thumb bar for single image
        }
    }

    // Hide arrow buttons when only one image
    if (_slides.length <= 1) {
        document.querySelectorAll('.carousel-btn').forEach(b => b.style.display = 'none');
    }
}

// Navigate to the previous slide
window.carouselPrev = function () {
    _currentSlide = (_currentSlide - 1 + _slides.length) % _slides.length;
    _applyCarousel();
};

// Navigate to the next slide
window.carouselNext = function () {
    _currentSlide = (_currentSlide + 1) % _slides.length;
    _applyCarousel();
};

// Jump to a specific slide (called from thumbnail onclick)
window.goToSlide = function (i) {
    _currentSlide = i;
    _applyCarousel();
};

function _applyCarousel() {
    document.querySelectorAll('.carousel-slide')
        .forEach((el, i) => el.classList.toggle('active', i === _currentSlide));
    document.querySelectorAll('.thumb')
        .forEach((el, i) => el.classList.toggle('active', i === _currentSlide));
}

// ─────────────────────────────────────────────────────────────────────────────
// Button wiring
// ─────────────────────────────────────────────────────────────────────────────

function _wireOrderBtn(svc) {
    const btn = document.getElementById('order-btn');
    if (!btn) return;
    btn.disabled = false;
    btn.addEventListener('click', () => {
        const user = getCurrentUser();
        if (!user) { alert('Please log in to place an order.'); location.href = 'Login.html'; return; }
        _openCheckoutModal(svc);
    });
}

function _wireFavBtn(serviceId) {
    const btn = document.getElementById('fav-btn');
    if (!btn) return;

    let isFav = false; // optimistic toggle — no state pre-fetch

    btn.addEventListener('click', async () => {
        const user = getCurrentUser();
        if (!user) { alert('Please log in to save favourites.'); return; }

        isFav = !isFav;
        _updateFavUI(btn, isFav);

        try {
            await apiFetch(`/api/Favorites/${serviceId}`, { method: isFav ? 'POST' : 'DELETE' });
        } catch {
            isFav = !isFav; // revert
            _updateFavUI(btn, isFav);
            alert('Could not update favourites. Please try again.');
        }
    });
}

function _updateFavUI(btn, active) {
    btn.innerHTML = active
        ? '<i class="fas fa-heart"></i> Saved'
        : '<i class="far fa-heart"></i> Favourite';
    btn.style.background    = active ? '#e74c3c' : '#fff';
    btn.style.color         = active ? '#fff'    : '#e74c3c';
    btn.style.borderColor   = '#e74c3c';
}

function _wireMsgBtn(avatarUrl, name) {
    const btn = document.getElementById('msg-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const phone = window._profilePhone || '';
        const msg   = encodeURIComponent(
            `Hello ${name || 'there'}! I saw your service on Sana'a and would like to discuss a project.`);
        window.open(
            phone ? `https://wa.me/${phone.replace(/\D/g,'')}?text=${msg}`
                  : `https://wa.me/?text=${msg}`,
            '_blank');
    });
}

function _wireReportBtn(serviceId) {
    const btn = document.getElementById('report-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const user = getCurrentUser();
        if (!user) { alert('Please log in to report a service.'); location.href = 'Login.html'; return; }
        // Navigate to the dedicated report page — form + business-logic gate lives there
        location.href = `report.html?targetId=${serviceId}&targetType=Service`;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function _setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function _esc(str) {
    return String(str ?? '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _showError(msg) {
    const grid = document.getElementById('detail-grid');
    if (grid) grid.style.display = 'none';
    const banner = document.getElementById('error-banner');
    if (banner) banner.style.display = 'block';
    const msgEl = document.getElementById('error-msg');
    if (msgEl) msgEl.textContent = msg;
}

function _friendlyMsg(err, serviceId) {
    const m = err?.message || '';
    if (m.includes('404') || m.toLowerCase().includes('not found'))
        return `Service #${serviceId} was not found — it may have been removed.`;
    if (m.includes('401') || m.includes('403'))
        return 'You do not have permission to view this service.';
    if (m.includes('500'))
        return 'The server encountered an error. Please try again later.';
    return `Could not load service: ${m || 'unknown error'}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Checkout Modal
// ─────────────────────────────────────────────────────────────────────────────

// ── Stripe module-level state ─────────────────────────────────────────────────
let _stripe         = null;   // Stripe instance (initialised once we have the publishableKey)
let _stripeElements = null;   // stripe.elements({ clientSecret }) instance
let _paymentEl      = null;   // mounted PaymentElement
let _pendingOrderId = null;   // orderID created in step 1, used in step 2

function _openCheckoutModal(svc) {
    // Populate order summary strip
    const titleEl = document.getElementById('co-service-title');
    const priceEl = document.getElementById('co-service-price');
    if (titleEl) titleEl.textContent = svc.title || 'Service';
    if (priceEl) priceEl.textContent = `$${Number(svc.basePrice).toFixed(2)}`;

    // Pre-fill location from stored user profile city
    const locEl = document.getElementById('co-location');
    if (locEl && !locEl.value) {
        try {
            const u = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (u.city) locEl.value = u.city;
        } catch { /* ignore */ }
    }

    // Always start on step 1
    _showStep(1);
    document.getElementById('checkout-modal')?.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function _closeCheckoutModal() {
    document.getElementById('checkout-modal')?.classList.remove('open');
    document.body.style.overflow = '';
    document.getElementById('checkout-form')?.reset();
    _clearPaymentErrors();

    // Unmount Stripe Element so it can be remounted fresh next time
    if (_paymentEl) { try { _paymentEl.unmount(); } catch { /* ignore */ } _paymentEl = null; }
    _stripeElements = null;
    _pendingOrderId = null;

    // Reset pay button
    const payBtn = document.getElementById('checkout-pay-btn');
    if (payBtn) { payBtn.disabled = true; payBtn.innerHTML = '<i class="fas fa-lock"></i> Pay Now'; }

    _showStep(1);
}

/** Toggle which step div is visible */
function _showStep(n) {
    document.getElementById('co-step1').style.display = n === 1 ? '' : 'none';
    document.getElementById('co-step2').style.display = n === 2 ? '' : 'none';
}

function _clearPaymentErrors() {
    const el = document.getElementById('payment-errors');
    if (el) el.textContent = '';
}

function _wireCheckoutModal(svc) {

    // ── Close triggers ────────────────────────────────────────────────────────
    ['checkout-close-btn', 'checkout-cancel-btn', 'co-cancel-step2-btn'].forEach(id =>
        document.getElementById(id)?.addEventListener('click', _closeCheckoutModal));

    document.getElementById('checkout-modal')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) _closeCheckoutModal();
    });

    // ── Back button: return to step 1 without losing entered data ────────────
    document.getElementById('co-back-btn')?.addEventListener('click', () => _showStep(1));

    // ── STEP 1: Order details form → create Order + PaymentIntent ────────────
    document.getElementById('checkout-form')?.addEventListener('submit', async e => {
        e.preventDefault();

        const locEl    = document.getElementById('co-location');
        const location = locEl?.value.trim();
        if (!location) {
            locEl?.classList.add('input-error');
            locEl?.focus();
            return;
        }
        locEl?.classList.remove('input-error');

        const nextBtn = document.getElementById('checkout-next-btn');
        if (nextBtn) { nextBtn.disabled = true; nextBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing…'; }

        try {
            // ── API call 1: Create the Order (status = Pending) ───────────────
            const orderRes = await apiJSON('/api/Orders', {
                method: 'POST',
                body: JSON.stringify({
                    freelancerID: svc.freelancerID ?? 0,
                    serviceID:    svc.serviceID,
                    description:  document.getElementById('co-description')?.value.trim() || '',
                    location
                })
            });
            // OrderService.CreateOrderAsync returns bool, not the object —
            // we fetch the order ID from the response if available, else query it
            _pendingOrderId = orderRes?.orderID ?? orderRes?.orderId ?? orderRes?.id;

            if (!_pendingOrderId) {
                // Some backends return true/false; fall back to fetching the latest order
                const latest = await apiJSON('/api/Orders/my-orders?pageNumber=1&pageSize=1');
                _pendingOrderId = (Array.isArray(latest) ? latest : (latest?.data ?? []))[0]?.orderID;
            }

            if (!_pendingOrderId) throw new Error('Could not retrieve the created order ID.');

            // ── API call 2: Create Stripe PaymentIntent ───────────────────────
            const intentRes = await apiJSON('/api/Payments/create-intent', {
                method: 'POST',
                body: JSON.stringify({ orderId: _pendingOrderId })
            });

            // intentRes = { clientSecret, paymentIntentId, publishableKey, amount, currency }

            // ── Initialise Stripe with the publishable key from the server ────
            if (!_stripe) {
                _stripe = window.Stripe(intentRes.publishableKey);
            }

            // ── Mount the Stripe Payment Element ─────────────────────────────
            _stripeElements = _stripe.elements({ clientSecret: intentRes.clientSecret });
            _paymentEl = _stripeElements.create('payment');
            _paymentEl.mount('#payment-element');

            // Enable Pay Now once the element signals it is ready
            _paymentEl.on('ready', () => {
                const payBtn = document.getElementById('checkout-pay-btn');
                if (payBtn) payBtn.disabled = false;
            });

            // Surface inline Stripe validation errors
            _paymentEl.on('change', ev => {
                const errEl = document.getElementById('payment-errors');
                if (errEl) errEl.textContent = ev.error?.message ?? '';
            });

            _showStep(2);

        } catch (err) {
            _showToast(err?.message || 'Could not prepare payment. Please try again.', 'error');
        } finally {
            if (nextBtn) { nextBtn.disabled = false; nextBtn.innerHTML = 'Continue to Payment <i class="fas fa-arrow-right" style="font-size:0.85rem"></i>'; }
        }
    });

    // ── STEP 2: Confirm payment with Stripe then notify backend ─────────────
    document.getElementById('checkout-pay-btn')?.addEventListener('click', async () => {
        const payBtn = document.getElementById('checkout-pay-btn');
        if (!_stripe || !_stripeElements) { _showToast('Payment not initialised. Please try again.', 'error'); return; }

        if (payBtn) { payBtn.disabled = true; payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing…'; }
        _clearPaymentErrors();

        // confirmPayment sends card details directly to Stripe — they never touch our server
        const { error, paymentIntent } = await _stripe.confirmPayment({
            elements:       _stripeElements,
            redirect:       'if_required',   // stay on page for card payments
            confirmParams:  { return_url: window.location.href }
        });

        if (error) {
            // Stripe declined the card or the user cancelled
            const errEl = document.getElementById('payment-errors');
            if (errEl) errEl.textContent = error.message ?? 'Payment failed.';
            _showToast(error.message ?? 'Payment failed.', 'error');
            if (payBtn) { payBtn.disabled = false; payBtn.innerHTML = '<i class="fas fa-lock"></i> Pay Now'; }
            return;
        }

        if (paymentIntent?.status === 'succeeded') {
            // ── API call 3: Tell the backend to verify & finalise ─────────────
            try {
                await apiJSON('/api/Payments/confirm', {
                    method: 'POST',
                    body: JSON.stringify({ paymentIntentId: paymentIntent.id })
                });
                _closeCheckoutModal();
                _showToast('Payment successful! Order placed. 🚀', 'success');
                setTimeout(() => { window.location.href = 'customer.html'; }, 2200);
            } catch (confirmErr) {
                // Payment went through on Stripe — webhook will still finalise the DB.
                // Show success with a warning rather than an error.
                _closeCheckoutModal();
                _showToast('Payment received! Your order is being confirmed…', 'success');
                setTimeout(() => { window.location.href = 'customer.html'; }, 2200);
            }
        } else {
            // requires_action, processing, etc. — Stripe handles redirect flows
            _showToast('Payment status: ' + (paymentIntent?.status ?? 'unknown') + '. Check your email.', 'success');
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────────────────────

function _showToast(msg, type = 'success') {
    const toast = document.getElementById('sd-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className   = `sd-toast toast-${type}`;
    void toast.offsetWidth;   // force reflow so the CSS transition fires again
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
}
