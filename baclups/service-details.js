/**
 * service-details.js — Premium Service Detail Page
 *
 * Lifecycle:
 *  1.  Extract ?id= → redirect to index.html if missing
 *  2.  Fetch GET /api/Services/{id} → ServiceDetailDto
 *  3.  Build carousel from service.imageUrls (falls back to category image)
 *  4.  Hydrate sidebar: price, meta, freelancer card
 *  5.  Hydrate main: category badge, title, description
 *  6.  Bind availability status label (isAvailable → green/red pill)
 *  7.  Wire buttons: Place Order, Favourite toggle, Message (WhatsApp), Report
 *  8.  Inject comment/review section; gate access behind purchase validation
 *  9.  Graceful error banner on 404 / network failure
 *
 * Carousel API (global so onclick="" attributes in HTML can reach them):
 *   carouselPrev()    — navigate to previous slide
 *   carouselNext()    — navigate to next slide
 *   goToSlide(index)  — jump to a specific slide
 */

import { apiJSON, apiFetch, resolveMediaUrl, API_BASE_URL } from './api.js';
import { getCurrentUser } from './auth.js';

// ── Category fallback images ──────────────────────────────────────────────────
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
let _svc          = null;   // populated after service fetch; shared with checkout

// ── Stripe module-level state ─────────────────────────────────────────────────
// All four variables are reset to null by _closeCheckoutModal() so a fresh
// open always starts clean — prevents stale Stripe Element reference hangs.
let _stripe         = null;
let _stripeElements = null;
let _paymentEl      = null;
let _pendingOrderId = null;

// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {

    // 1. Parse and validate ?id=
    const params    = new URLSearchParams(location.search);
    const serviceId = parseInt(params.get('id') ?? '', 10);

    if (!serviceId || serviceId <= 0) {
        console.warn('[sd] No valid ?id= — redirecting home');
        location.href = 'index.html';
        return;
    }

    // 2. Fetch service data
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
    _svc = svc;

    // 3. Strip skeleton shimmer
    document.querySelectorAll('.skeleton').forEach(el => el.classList.remove('skeleton'));

    // 4. Carousel
    const fallback  = CAT_IMAGES[svc.categoryID] || 'Images/logo.png';
    const imageList = svc.imageUrls?.length > 0 ? svc.imageUrls : [fallback];
    _buildCarousel(imageList);

    // 5. Price card
    _setText('service-price',         `$${Number(svc.basePrice).toFixed(2)}`);
    _setText('service-delivery',      'To be agreed');
    _setText('service-buyers',        '—');
    _setText('service-tools-display', '—');

    const rating    = Number(svc.freelancerRating ?? 0);
    const fullStars = Math.round(rating);
    _setText('service-stars',      '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars));
    _setText('service-rating-val', rating > 0 ? `(${rating.toFixed(1)})` : '(—)');

    // 6. Owner card
    _setText('freelancer-name',        svc.freelancerName || 'Freelancer');
    _setText('freelancer-city',        svc.freelancerCity || '');
    _setText('freelancer-bio',         svc.freelancerBio  || '');
    _setText('freelancer-rating-mini',
        rating > 0 ? `⭐ ${rating.toFixed(1)} / 5` : '');

    const avatar = document.getElementById('freelancer-avatar');
    if (avatar) {
        avatar.src = svc.freelancerAvatarUrl
            ? resolveMediaUrl(svc.freelancerAvatarUrl)
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(svc.freelancerName || 'FL')}&background=3498db&color=fff`;
        avatar.alt = svc.freelancerName || 'Owner';
    }

    const nameEl = document.getElementById('freelancer-name');
    if (nameEl && svc.freelancerName) {
        nameEl.innerHTML =
            `<i class="fas fa-check-circle verified-dot"></i> ${_esc(svc.freelancerName)}`;
    }

    // 7. Main content
    _setText('service-category',    svc.categoryName || 'General');
    _setText('service-title',       svc.title        || 'Untitled Service');
    _setText('service-description', svc.description  || 'No description provided.');
    document.title = `${svc.title} — Sana'a`;

    // 8. Availability pill
    _bindAvailabilityStatus(svc);

    // 9. Wire all buttons
    _wireOrderBtn(svc);
    _wireFavBtn(svc.serviceID);
    _wireMsgBtn(svc);
    _wireReportBtn(svc.serviceID);
    _wireCheckoutModal(svc);

    // 10. Comment section + purchase gate
    _injectCommentSection();
    await _gateInteractionsOnPurchase(svc.serviceID);
});

// ─────────────────────────────────────────────────────────────────────────────
// Availability status
// ─────────────────────────────────────────────────────────────────────────────

function _bindAvailabilityStatus(svc) {
    const label = document.querySelector('.availability-label');
    if (!label) return;
    const isAvailable = svc.isAvailable ?? svc.availabilityStatus ?? true;
    if (isAvailable) {
        label.textContent = 'Active';
        label.style.cssText =
            'background:#d4edda;color:#155724;padding:.2rem .7rem;' +
            'border-radius:999px;font-size:.78rem;font-weight:600;';
    } else {
        label.textContent = 'Unavailable';
        label.style.cssText =
            'background:#f8d7da;color:#721c24;padding:.2rem .7rem;' +
            'border-radius:999px;font-size:.78rem;font-weight:600;';
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Comment section injection + purchase gate
// ─────────────────────────────────────────────────────────────────────────────

function _injectCommentSection() {
    const main = document.querySelector('#detail-grid main');
    if (!main || document.getElementById('sd-comment-section')) return;

    const section = document.createElement('div');
    section.id = 'sd-comment-section';
    section.style.marginTop = '1.5rem';
    section.innerHTML = `
        <div class="sd-card" id="sd-comment-card">
            <h3 style="font-size:1.1rem;font-weight:700;color:#2c3e50;margin:0 0 1.1rem;">
                <i class="fas fa-comments" style="color:#1877f2;margin-right:.4rem;"></i>
                Reviews &amp; Comments
            </h3>
            <div id="sd-purchase-gate"
                 style="display:none;background:#fff8e1;border:1px solid #ffc107;
                        border-radius:10px;padding:1rem 1.2rem;margin-bottom:1rem;
                        align-items:center;gap:.75rem;">
                <i class="fas fa-lock" style="font-size:1.3rem;color:#f39c12;flex-shrink:0;"></i>
                <p style="margin:0;font-size:.88rem;color:#856404;line-height:1.5;">
                    You can only leave reviews or comments after purchasing this service package.
                </p>
            </div>
            <div id="sd-comment-form-wrap">
                <textarea id="sd-comment-input" rows="3"
                          placeholder="Share your experience with this service…"
                          style="width:100%;box-sizing:border-box;padding:.75rem .9rem;
                                 border:1.5px solid #e2e8f0;border-radius:10px;
                                 font-family:inherit;font-size:.9rem;resize:vertical;
                                 outline:none;transition:border-color .2s,box-shadow .2s;
                                 background:#fafbfc;"></textarea>
                <div style="display:flex;justify-content:flex-end;margin-top:.65rem;">
                    <button id="sd-comment-submit"
                            style="background:#1877f2;color:#fff;border:none;
                                   padding:.6rem 1.4rem;border-radius:10px;
                                   font-size:.88rem;font-weight:600;cursor:pointer;
                                   transition:opacity .2s,transform .15s;">
                        <i class="fas fa-paper-plane"></i> Submit Review
                    </button>
                </div>
            </div>
            <div id="sd-comments-list"
                 style="margin-top:1rem;display:flex;flex-direction:column;gap:.7rem;"></div>
        </div>`;

    main.appendChild(section);

    const ta = document.getElementById('sd-comment-input');
    if (ta) {
        ta.addEventListener('focus', () => {
            ta.style.borderColor = '#1877f2';
            ta.style.boxShadow   = '0 0 0 3px rgba(24,119,242,.12)';
        });
        ta.addEventListener('blur', () => {
            ta.style.borderColor = '#e2e8f0';
            ta.style.boxShadow   = '';
        });
    }

    document.getElementById('sd-comment-submit')
        ?.addEventListener('click', _handleCommentSubmit);
}

async function _handleCommentSubmit() {
    const input     = document.getElementById('sd-comment-input');
    const submitBtn = document.getElementById('sd-comment-submit');
    const text      = (input?.value ?? '').trim();
    if (!text) { input?.focus(); return; }

    if (submitBtn) {
        submitBtn.disabled  = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting…';
    }

    try {
        await apiFetch('/api/Reviews', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ serviceID: _svc?.serviceID, comment: text }),
        }).catch(() => null);

        const list = document.getElementById('sd-comments-list');
        if (list) {
            const user = getCurrentUser();
            const div  = document.createElement('div');
            div.style.cssText =
                'background:#f8f9fb;border-radius:10px;padding:.75rem 1rem;' +
                'font-size:.88rem;color:#2c3e50;line-height:1.6;';
            div.innerHTML = `
                <strong style="font-size:.82rem;color:#1877f2;">
                    <i class="fas fa-user-circle"></i>
                    ${_esc(user?.fullName ?? user?.name ?? 'You')}
                </strong>
                <span style="color:#aaa;font-size:.75rem;margin-left:.5rem;">just now</span>
                <p style="margin:.35rem 0 0;">${_esc(text)}</p>`;
            list.prepend(div);
        }

        if (input) input.value = '';
        _showToast('Review submitted! 🎉', 'success');
    } catch {
        _showToast('Could not submit your review. Please try again.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled  = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Review';
        }
    }
}

async function _gateInteractionsOnPurchase(serviceId) {
    const user = getCurrentUser();
    if (!user) { _applyPurchaseGate(false); return; }

    try {
        const response = await apiJSON('/api/Orders/my-purchased-services', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ pageSize: 50, pageNumber: 1 }),
        });

        const orders = Array.isArray(response)
            ? response
            : (response?.data ?? response?.items ?? response?.orders ?? []);

        const hasPurchased = orders.some(o => {
            const matchesService = (o.serviceID ?? o.serviceId) === serviceId;
            const status         = (o.status ?? '').toLowerCase();
            return matchesService && (status === 'completed' || status === 'paid' || status === 'accepted');
        });

        _applyPurchaseGate(hasPurchased);
    } catch {
        _applyPurchaseGate(false);
    }
}

function _applyPurchaseGate(hasPurchased) {
    const gate      = document.getElementById('sd-purchase-gate');
    const formWrap  = document.getElementById('sd-comment-form-wrap');
    const input     = document.getElementById('sd-comment-input');
    const submitBtn = document.getElementById('sd-comment-submit');

    if (gate)      gate.style.display      = hasPurchased ? 'none' : 'flex';
    if (formWrap)  formWrap.style.display  = hasPurchased ? ''     : 'none';
    if (input)     input.disabled          = !hasPurchased;
    if (submitBtn) submitBtn.disabled      = !hasPurchased;

    const reportBtn = document.getElementById('report-btn');
    if (!reportBtn) return;

    if (hasPurchased) {
        reportBtn.replaceWith(reportBtn.cloneNode(true));
        const fresh = document.getElementById('report-btn');
        if (fresh) {
            fresh.style.opacity = '';
            fresh.style.cursor  = '';
            fresh.addEventListener('click', () => {
                const user = getCurrentUser();
                if (!user) { alert('Please log in to report a service.'); location.href = 'Login.html'; return; }
                location.href = `report.html?targetId=${_svc?.serviceID}&targetType=Service`;
            });
        }
    } else {
        reportBtn.style.opacity = '0.45';
        reportBtn.style.cursor  = 'not-allowed';
        reportBtn.addEventListener('click', e => {
            e.stopImmediatePropagation();
            _showToast('You can only report a service after purchasing it.', 'error');
        }, { capture: true });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Carousel engine
// ─────────────────────────────────────────────────────────────────────────────

function _buildCarousel(urls) {
    _slides       = urls;
    _currentSlide = 0;

    const track  = document.getElementById('carousel-track');
    const thumbs = document.getElementById('carousel-thumbs');
    if (!track) return;

    track.innerHTML = _slides.map((url, i) => `
        <img src="${_esc(resolveMediaUrl(url))}"
             alt="Service image ${i + 1}"
             class="carousel-slide${i === 0 ? ' active' : ''}"
             onerror="this.src='Images/logo.png'">`
    ).join('');

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
            thumbs.style.display = 'none';
        }
    }

    if (_slides.length <= 1) {
        document.querySelectorAll('.carousel-btn').forEach(b => b.style.display = 'none');
    }
}

window.carouselPrev = function () {
    _currentSlide = (_currentSlide - 1 + _slides.length) % _slides.length;
    _applyCarousel();
};
window.carouselNext = function () {
    _currentSlide = (_currentSlide + 1) % _slides.length;
    _applyCarousel();
};
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
// Action button wiring
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

    let isFav = false;
    btn.addEventListener('click', async () => {
        const user = getCurrentUser();
        if (!user) { alert('Please log in to save favourites.'); return; }
        isFav = !isFav;
        _updateFavUI(btn, isFav);
        try {
            await apiFetch(`/api/Favorites/${serviceId}`, { method: isFav ? 'POST' : 'DELETE' });
        } catch {
            isFav = !isFav;
            _updateFavUI(btn, isFav);
            alert('Could not update favourites. Please try again.');
        }
    });
}

function _updateFavUI(btn, active) {
    btn.innerHTML         = active ? '<i class="fas fa-heart"></i> Saved' : '<i class="far fa-heart"></i> Favourite';
    btn.style.background  = active ? '#e74c3c' : '#fff';
    btn.style.color       = active ? '#fff'    : '#e74c3c';
    btn.style.borderColor = '#e74c3c';
}

function _wireMsgBtn(svc) {
    const btn = document.getElementById('msg-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const rawPhone = svc.freelancerPhone ?? svc.freelancerPhoneNumber ?? svc.ownerPhone ?? '';
        const phone    = rawPhone.replace(/[^0-9]/g, '');
        const greeting = encodeURIComponent(
            `Hello ${_esc(svc.freelancerName || 'there')}! ` +
            `I saw your service "${_esc(svc.title || '')}" on Sana'a and I'd like to discuss a project.`
        );
        const url = phone
            ? `https://wa.me/${phone}?text=${greeting}`
            : `https://wa.me/?text=${greeting}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    });
}

function _wireReportBtn(serviceId) {
    const btn = document.getElementById('report-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const user = getCurrentUser();
        if (!user) { alert('Please log in to report a service.'); location.href = 'Login.html'; return; }
        location.href = `report.html?targetId=${serviceId}&targetType=Service`;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Checkout Modal
// ─────────────────────────────────────────────────────────────────────────────

function _openCheckoutModal(svc) {
    const titleEl = document.getElementById('co-service-title');
    const priceEl = document.getElementById('co-service-price');
    if (titleEl) titleEl.textContent = svc.title || 'Service';
    if (priceEl) priceEl.textContent = `$${Number(svc.basePrice).toFixed(2)}`;

    // Pre-fill location from stored profile
    const locEl = document.getElementById('co-location');
    if (locEl && !locEl.value) {
        try {
            const u = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (u.city) locEl.value = u.city;
        } catch { /* ignore */ }
    }

    _showStep(1);
    document.getElementById('checkout-modal')?.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function _closeCheckoutModal() {
    document.getElementById('checkout-modal')?.classList.remove('open');
    document.body.style.overflow = '';
    document.getElementById('checkout-form')?.reset();
    _clearPaymentErrors();

    // Unmount Stripe element so it can be remounted fresh on next open
    if (_paymentEl) {
        try { _paymentEl.unmount(); } catch { /* ignore */ }
        _paymentEl = null;
    }
    _stripeElements = null;
    _pendingOrderId = null;

    // Hide the Stripe container and clear any lingering error message
    const container = document.getElementById('stripePaymentContainer');
    const msgEl     = document.getElementById('payment-message');
    if (container) container.style.display = 'none';
    if (msgEl)     { msgEl.textContent = ''; msgEl.style.display = 'none'; }

    _showStep(1);
}

function _showStep(n) {
    const s1 = document.getElementById('co-step1');
    const s2 = document.getElementById('co-step2');
    if (s1) s1.style.display = n === 1 ? '' : 'none';
    if (s2) s2.style.display = n === 2 ? '' : 'none';
}

function _clearPaymentErrors() {
    const el = document.getElementById('payment-errors');
    if (el) el.textContent = '';
}

// ── Step 1 button label constants ─────────────────────────────────────────────
const _NEXT_BTN_DEFAULT = 'Continue to Payment <i class="fas fa-arrow-right" style="font-size:0.85rem"></i>';
const _NEXT_BTN_LOADING = '<i class="fas fa-spinner fa-spin"></i> Preparing…';

function _wireCheckoutModal(svc) {

    // ── Close / cancel triggers ───────────────────────────────────────────────
    ['checkout-close-btn', 'checkout-cancel-btn', 'co-cancel-step2-btn'].forEach(id =>
        document.getElementById(id)?.addEventListener('click', _closeCheckoutModal));

    document.getElementById('checkout-modal')
        ?.addEventListener('click', e => { if (e.target === e.currentTarget) _closeCheckoutModal(); });

    document.getElementById('co-back-btn')
        ?.addEventListener('click', () => _showStep(1));

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1 — "Continue to Payment" submit handler
    //
    // Workflow:
    //   1. Validate location field
    //   2. Lock button → "Preparing Payment Gateway..."
    //   3. POST /api/Orders          → extract orderId (all response shapes)
    //   4. POST /api/Payments/create-intent { orderId: int }  (raw fetch, explicit Bearer)
    //   5a. Response has sessionUrl  → window.location.href redirect
    //   5b. Response has clientSecret → mount Stripe Payment Element, advance to step 2
    //
    // `nextBtn` is captured OUTSIDE try{} so `finally` can always reach it.
    // `finally` runs unconditionally — the button can never stay frozen.
    // ─────────────────────────────────────────────────────────────────────────
    document.getElementById('checkout-form')?.addEventListener('submit', async e => {
        e.preventDefault();

        // ── Validate location ─────────────────────────────────────────────────
        const locEl    = document.getElementById('co-location');
        const location = locEl?.value.trim();
        if (!location) {
            locEl?.classList.add('input-error');
            locEl?.focus();
            return;
        }
        locEl?.classList.remove('input-error');

        // ── Capture button reference OUTSIDE try so finally always has it ─────
        const nextBtn = document.getElementById('checkout-next-btn');

        // ── Lock UI immediately ───────────────────────────────────────────────
        if (nextBtn) {
            nextBtn.disabled  = true;
            nextBtn.textContent = 'Preparing Payment Gateway...';
        }

        try {
            // ── Auth guard ────────────────────────────────────────────────────
            const user = getCurrentUser();
            if (!user) throw new Error('Please log in to complete your order.');

            const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
            if (!token) throw new Error('Your session has expired. Please log in again.');

            // ── Step A: Create the Order ──────────────────────────────────────
            const orderPayload = {
                freelancerID: svc.freelancerID ?? 0,
                serviceID:    svc.serviceID,
                description:  (document.getElementById('co-description')?.value.trim() || ''),
                location,
            };

            let orderRes;
            try {
                orderRes = await apiJSON('/api/Orders', {
                    method:  'POST',
                    headers: {
                        'Content-Type':  'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify(orderPayload),
                });
            } catch (orderErr) {
                const status = _extractStatus(orderErr);
                if (status === 401) throw new Error('Session expired. Please log in again and retry.');
                if (status === 400) throw new Error('Invalid order details. Please check your inputs and retry.');
                throw new Error(`Order creation failed: ${orderErr?.message || 'Unknown error'}`);
            }

            // ── Step B: Direct Order ID read ──────────────────────────────────
            // Backend now guarantees { orderId: <int> } — no fallback chain needed.
            // parseInt(..., 10) is safe: if orderId is absent, parseInt(undefined, 10)
            // returns NaN and the guard below fires immediately with a clear message.
            console.log('[Checkout] Order creation response payload:', orderRes);

            const parsedOrderId = parseInt(orderRes?.orderId, 10);

            if (!parsedOrderId || isNaN(parsedOrderId) || parsedOrderId <= 0) {
                throw new Error(
                    'Order was created but its ID could not be read from the server response. ' +
                    'Please contact support or try again.'
                );
            }

            _pendingOrderId = parsedOrderId;

            console.log(`[Checkout] Requesting Stripe Intent for Order ID: ${_pendingOrderId}`);

            // ── Step C: Create the Stripe Payment Intent ──────────────────────
            // Using raw fetch (not apiJSON) so the Authorization header is
            // explicit and the HTTP status is readable before JSON parsing —
            // this is the second most common cause of the "Preparing…" hang.
            const intentHttpRes = await fetch(`${API_BASE_URL}/api/Payments/create-intent`, {
                method:  'POST',
                headers: {
                    'Content-Type':  'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ orderId: _pendingOrderId }),
            });

            if (!intentHttpRes.ok) {
                const errBody = await intentHttpRes.json().catch(() => ({}));
                const errMsg  = errBody?.message || errBody?.title || `HTTP ${intentHttpRes.status}`;
                if (intentHttpRes.status === 401) throw new Error('Payment authorisation failed. Please log in again.');
                if (intentHttpRes.status === 400) throw new Error(`Payment intent rejected: ${errMsg}`);
                if (intentHttpRes.status === 404) throw new Error('Order not found on the server. Please refresh and retry.');
                throw new Error(`Payment setup failed (${intentHttpRes.status}): ${errMsg}`);
            }

            const paymentData = await intentHttpRes.json();
            console.log('[Checkout] Stripe Intent generated successfully:', paymentData);

            // ── Step D: Validate the intent payload ───────────────────────────
            if (!paymentData) {
                throw new Error('Server returned an empty response for the payment intent.');
            }

            // ── Path 1: Stripe-hosted Checkout Session (redirect flow) ─────────
            const sessionUrl = paymentData.sessionUrl ?? paymentData.checkoutUrl ?? paymentData.url ?? null;

            if (sessionUrl) {
                _closeCheckoutModal();
                _showToast('Redirecting to secure payment…', 'success');
                setTimeout(() => { window.location.href = sessionUrl; }, 600);
                return;   // finally still runs after return
            }

            // ── Path 2: Stripe Payment Element (embedded flow) ────────────────
            const clientSecret   = paymentData.clientSecret   ?? paymentData.client_secret   ?? null;
            const publishableKey = paymentData.publishableKey ?? paymentData.publishable_key ?? null;

            if (!clientSecret) {
                throw new Error(
                    'Payment intent is missing the client secret. ' +
                    'Please contact support or try again.'
                );
            }
            if (!publishableKey) {
                throw new Error('Stripe publishable key not returned by server. Please contact support.');
            }
            if (typeof window.Stripe !== 'function') {
                throw new Error('Stripe.js failed to load. Please check your connection and refresh.');
            }

            // Show step 2 FIRST so #co-step2 is visible before Stripe measures the container.
            // Stripe's mount() needs a non-hidden parent to calculate dimensions —
            // calling it while #co-step2 has display:none causes "element not found".
            _showStep(2);
            _initializeEmbeddedStripeElements(clientSecret, publishableKey);

        } catch (err) {
            const msg = err?.message || 'Could not prepare payment. Please try again.';
            console.error('[Checkout Critical Failure]:', err);
            alert(`Checkout Error: ${msg}`);
            _showToast(msg, 'error');
        } finally {
            // ALWAYS restore the button — runs even after return and after throws
            if (nextBtn && document.body.contains(nextBtn)) {
                nextBtn.disabled    = false;
                nextBtn.textContent = 'Continue to Payment';
            }
        }
    });

    // Step 2 "Pay Now" is wired inside _initializeEmbeddedStripeElements — nothing to wire here.
}

// ─────────────────────────────────────────────────────────────────────────────
// Stripe Payment Element — mount, show, and wire the Pay button
// ─────────────────────────────────────────────────────────────────────────────

function _initializeEmbeddedStripeElements(clientSecret, publishableKey) {
    // Unmount any previous element so a second modal open starts clean
    if (_paymentEl) {
        try { _paymentEl.unmount(); } catch { /* ignore */ }
        _paymentEl = null;
    }

    // Initialise the Stripe.js instance once per page load
    if (!_stripe) {
        _stripe = window.Stripe(publishableKey);
    }

    // Create the Stripe Elements group bound to this specific PaymentIntent
    _stripeElements = _stripe.elements({ clientSecret });
    _paymentEl      = _stripeElements.create('payment');
    _paymentEl.mount('#payment-element');

    // Show the container only after mount — prevents the blank-box flash
    const container = document.getElementById('stripePaymentContainer');
    const submitBtn = document.getElementById('submit-stripe-btn');
    const msgEl     = document.getElementById('payment-message');

    if (container) container.style.display = '';

    // Surface inline Stripe validation errors in #payment-message
    _paymentEl.on('change', ev => {
        if (!msgEl) return;
        if (ev.error?.message) {
            msgEl.textContent    = ev.error.message;
            msgEl.style.display  = '';
        } else {
            msgEl.textContent    = '';
            msgEl.style.display  = 'none';
        }
    });

    // ── "Pay Now" click handler ───────────────────────────────────────────────
    if (!submitBtn) return;

    // Replace any stale listener from a previous mount by cloning the node
    const freshBtn = submitBtn.cloneNode(true);
    submitBtn.replaceWith(freshBtn);

    freshBtn.addEventListener('click', async () => {
        if (!_stripe || !_stripeElements) {
            alert('Payment session not initialised. Please close and try again.');
            return;
        }

        freshBtn.disabled  = true;
        freshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing…';
        if (msgEl) { msgEl.textContent = ''; msgEl.style.display = 'none'; }

        try {
            const { error, paymentIntent } = await _stripe.confirmPayment({
                elements:      _stripeElements,
                redirect:      'if_required',
                confirmParams: {
                    // On card redirect flows Stripe returns here; query param lets
                    // customer.html show a "payment successful" confirmation banner.
                    return_url: `${window.location.origin}/Frontend/san3a-edit/customer.html?payment=success`,
                },
            });

            if (error) {
                if (msgEl) {
                    msgEl.textContent   = error.message ?? 'Payment failed.';
                    msgEl.style.display = '';
                }
                _showToast(error.message ?? 'Payment failed.', 'error');
                return;   // finally re-enables the button
            }

            if (paymentIntent?.status === 'succeeded') {
                // Notify backend to verify + finalise the order
                try {
                    const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
                    await apiJSON('/api/Payments/confirm', {
                        method:  'POST',
                        headers: {
                            'Content-Type':  'application/json',
                            'Authorization': `Bearer ${token}`,
                        },
                        body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
                    });
                } catch (confirmErr) {
                    // Stripe already charged the card — webhook handles DB update.
                    console.warn('[sd] Backend /confirm failed (webhook will finalise):', confirmErr);
                }
                _closeCheckoutModal();
                _showToast('Payment successful! Order placed. 🚀', 'success');
                setTimeout(() => { window.location.href = 'customer.html?payment=success'; }, 2200);

            } else {
                const status = paymentIntent?.status ?? 'unknown';
                _showToast(`Payment status: ${status}. Check your email for confirmation.`, 'success');
            }

        } catch (err) {
            const msg = err?.message || 'An unexpected error occurred during payment.';
            console.error('[sd] Stripe confirmPayment error:', err);
            if (msgEl) { msgEl.textContent = msg; msgEl.style.display = ''; }
            _showToast(msg, 'error');
        } finally {
            if (freshBtn && document.body.contains(freshBtn)) {
                freshBtn.disabled  = false;
                freshBtn.innerHTML = '<i class="fas fa-lock"></i> Pay Now';
            }
        }
    });
}

// ── "Continue to Payment" button helper ──────────────────────────────────────
function _setNextBtn(btn, isLoading) {
    if (!btn) return;
    btn.disabled  = isLoading;
    btn.innerHTML = isLoading ? _NEXT_BTN_LOADING : _NEXT_BTN_DEFAULT;
}

// Extract a numeric HTTP status from an apiJSON error message string
function _extractStatus(err) {
    const m = err?.message ?? '';
    const match = m.match(/\b(4\d{2}|5\d{2})\b/);
    return match ? parseInt(match[1], 10) : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

function _setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function _esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _showError(msg) {
    const grid   = document.getElementById('detail-grid');
    const banner = document.getElementById('error-banner');
    const msgEl  = document.getElementById('error-msg');
    if (grid)   grid.style.display   = 'none';
    if (banner) banner.style.display = 'block';
    if (msgEl)  msgEl.textContent    = msg;
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
// Toast
// ─────────────────────────────────────────────────────────────────────────────

function _showToast(msg, type = 'success') {
    const toast = document.getElementById('sd-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className   = `sd-toast toast-${type}`;
    void toast.offsetWidth;   // force reflow so CSS transition re-fires
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
}
