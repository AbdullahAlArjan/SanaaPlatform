import { requireAuth, getCurrentUser } from './auth.js';
import { apiFetch, apiJSON } from './api.js';

// ── Category configuration (must match seeded DB: IDs 1–6) ───────────────────
const CATEGORY_NAMES = {
    1: 'تصميم جرافيك',
    2: 'برمجة وتطوير',
    3: 'صيانة منزلية',
    4: 'كتابة محتوى',
    5: 'تسويق رقمي',
    6: 'مونتاج فيديو',
};

const CATEGORY_IMAGES = {
    1: 'Images/logo.png',
    2: 'Images/service2.jpg',
    3: 'Images/service3.png',
    4: 'Images/seo.jpeg',
    5: 'Images/sm.png',
    6: 'Images/mb.jpeg',
};

// ── DOM refs ──────────────────────────────────────────────────────────────────
const sortSelect     = document.getElementById('sortOptions');
const postsContainer = document.querySelector('.posts-container');

let isUSD        = true;
const exchangeRate = 0.709;

// ── Module-level favorites array ──────────────────────────────────────────────
// Populated once per page load by _loadFavoriteIds(), then kept in sync by
// addToFavorites() so that renderServiceCard() always reflects the true DB state
// without needing an extra round-trip after each toggle.
let userFavoriteIds = [];

// ── Sort ──────────────────────────────────────────────────────────────────────
function sortPosts() {
    if (!postsContainer || !sortSelect) return;
    const cards     = Array.from(postsContainer.querySelectorAll('.post-card'));
    const sortValue = sortSelect.value;

    cards.sort((a, b) => {
        const aRating = parseFloat(a.dataset.rating) || 0;
        const bRating = parseFloat(b.dataset.rating) || 0;
        const aPrice  = parseFloat(a.dataset.price)  || 0;
        const bPrice  = parseFloat(b.dataset.price)  || 0;

        switch (sortValue) {
            case 'rating_high': return bRating - aRating;
            case 'rating_low':  return aRating - bRating;
            case 'price_high':  return bPrice  - aPrice;
            case 'price_low':   return aPrice  - bPrice;
            default:            return 0;
        }
    });

    postsContainer.innerHTML = '';
    cards.forEach(card => postsContainer.appendChild(card));
}

if (sortSelect) sortSelect.addEventListener('change', sortPosts);

// ── Currency conversion ───────────────────────────────────────────────────────
function toggleCurrency() {
    const currencyToggle = document.getElementById('currencyToggle');
    document.querySelectorAll('.price').forEach(el => {
        const text = el.textContent;
        if (isUSD) {
            const usd = parseFloat(text.replace('$', ''));
            el.textContent = `${(usd * exchangeRate).toFixed(0)} JOD`;
        } else {
            const jod = parseFloat(text.replace(' JOD', ''));
            el.textContent = `$${(jod / exchangeRate).toFixed(0)}`;
        }
    });
    isUSD = !isUSD;
    if (currencyToggle) currencyToggle.textContent = isUSD ? 'JOD → USD' : 'USD → JOD';
    sortPosts();
}

// ── Favorite ID pre-fetch ─────────────────────────────────────────────────────
// Populates `userFavoriteIds` before any card is rendered so the heart icon
// reflects real DB state on load (fixes the refresh-reset bug).
//
// Strategy:
//   1. Try POST /api/Favorites/my-favorites  (paginated, preferred endpoint)
//   2. On any failure fall back to GET /api/Favorites (older / simpler endpoint)
//   3. On second failure, silently set userFavoriteIds = [] — page still loads
//
// ID extraction normalises across all observed C# serialisation variants:
//   serviceID  (PascalCase DTO)
//   serviceId  (camelCase JSON default)
//   id         (minimal DTO)
async function _loadFavoriteIds() {
    if (!getCurrentUser()) {
        userFavoriteIds = [];
        return;
    }

    const _extract = response => {
        if (response == null) return [];
        const list = Array.isArray(response)
            ? response
            : (response.items || response.data || response.favorites || []);
        return Array.isArray(list)
            ? list
                .map(f => Number(f.serviceID ?? f.serviceId ?? f.id ?? 0))
                .filter(n => n > 0)
            : [];
    };

    // ── Attempt 1: POST endpoint ──────────────────────────────────────────────
    try {
        const res = await apiJSON('/api/Favorites/my-favorites', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ pageSize: 200 }),
        });
        userFavoriteIds = _extract(res);
        return;
    } catch { /* fall through to GET fallback */ }

    // ── Attempt 2: GET endpoint (fallback) ────────────────────────────────────
    try {
        const res = await apiJSON('/api/Favorites');
        userFavoriteIds = _extract(res);
    } catch {
        userFavoriteIds = [];
    }
}

// ── Service card renderer ─────────────────────────────────────────────────────
// Reads `userFavoriteIds` (already loaded) — no async call needed here.
// data-fav and data-service-id are written on the button so addToFavorites()
// can toggle correctly and so DOM queries work when updating the overview panel.
function renderServiceCard(service, catId) {
    const img      = CATEGORY_IMAGES[catId] || 'Images/logo.png';
    const price    = parseFloat(service.basePrice ?? 0);
    const title    = service.title || 'Untitled Service';
    const desc     = (service.description || '').slice(0, 80) +
                     ((service.description?.length ?? 0) > 80 ? '…' : '');
    const id       = Number(service.serviceID ?? service.serviceId ?? service.id ?? 0);

    const isAlreadyFav = userFavoriteIds.includes(id);
    const heartClass   = isAlreadyFav ? 'fas fa-heart' : 'far fa-heart';
    const heartColor   = isAlreadyFav ? 'color:#ef4444;' : '';
    const favLabel     = isAlreadyFav ? 'إزالة من المفضلة' : 'أضف للمفضلة';

    return `
        <a href="service-details.html?id=${id}" class="post-card"
           data-rating="0" data-price="${price}"
           style="text-decoration:none;color:inherit;">
            <img src="${img}" alt="${_esc(title)}" class="post-image"
                 onerror="this.src='Images/logo.png'">
            <div class="post-details">
                <h3>${_esc(title)}</h3>
                <div class="price-rating">
                    <span class="price">${price}$</span>
                    <div class="rating">⭐ —</div>
                    <button class="fav-btn"
                            data-fav="${isAlreadyFav}"
                            data-service-id="${id}"
                            onclick="addToFavorites(${id}, this); event.stopPropagation();"
                            aria-label="${favLabel}"
                            title="${favLabel}">
                        <i class="${heartClass}" style="${heartColor}"></i>
                    </button>
                </div>
                ${desc ? `<p class="service-desc" style="font-size:.8rem;color:#666;margin-top:.4rem">${_esc(desc)}</p>` : ''}
                <div class="provider-info">
                    <i class="fas fa-tag" style="color:#1877f2"></i>
                    <span>${_esc(CATEGORY_NAMES[catId] || 'General')}</span>
                </div>
            </div>
        </a>`;
}

// ── Load services by category ─────────────────────────────────────────────────
async function loadServicesByCategory(catId) {
    if (!postsContainer) return;

    _showCategoryHeading(catId);

    // Clear static placeholder HTML immediately — no stale cards
    postsContainer.innerHTML =
        '<p style="text-align:center;padding:3rem;color:#666">جاري التحميل…</p>';

    // Pre-fetch favorite IDs and service list in parallel
    const [, serviceResult] = await Promise.allSettled([
        _loadFavoriteIds(),
        apiJSON(`/api/Services?categoryId=${catId}`),
    ]);

    if (serviceResult.status === 'rejected') {
        postsContainer.innerHTML =
            `<p style="text-align:center;padding:3rem;color:#e74c3c">خطأ أثناء التحميل.</p>`;
        return;
    }

    const rawData  = serviceResult.value;
    const services = Array.isArray(rawData)
        ? rawData
        : (rawData?.data || rawData?.items || []);

    if (!services.length) {
        postsContainer.innerHTML =
            `<p style="text-align:center;padding:3rem;color:#888">لا توجد خدمات في هذه الفئة بعد.</p>`;
        return;
    }

    // renderServiceCard reads userFavoriteIds synchronously — no extra arg needed
    postsContainer.innerHTML = services.map(s => renderServiceCard(s, catId)).join('');
    sortPosts();
}

// ── Load all active services ──────────────────────────────────────────────────
async function loadAllServices() {
    if (!postsContainer) return;

    // Wipe container immediately — never leave static HTML cards visible
    postsContainer.innerHTML =
        '<p style="text-align:center;padding:3rem;color:#666">جاري التحميل…</p>';

    // Pre-fetch favorites and services in parallel; favorites degrade silently
    const [, serviceResult] = await Promise.allSettled([
        _loadFavoriteIds(),
        apiJSON('/api/Services'),
    ]);

    if (serviceResult.status === 'rejected') {
        postsContainer.innerHTML =
            `<p style="text-align:center;padding:3rem;color:#e74c3c">
                تعذّر تحميل الخدمات. يرجى المحاولة مجدداً.
             </p>`;
        return;
    }

    const rawData  = serviceResult.value;
    const services = Array.isArray(rawData)
        ? rawData
        : (rawData?.data || rawData?.items || []);

    if (!services.length) {
        postsContainer.innerHTML =
            `<p style="text-align:center;padding:3rem;color:#888">لا توجد خدمات متاحة حالياً.</p>`;
        return;
    }

    postsContainer.innerHTML = services
        .map(s => renderServiceCard(s, s.categoryID ?? s.categoryId ?? 0))
        .join('');

    if (sortSelect) {
        sortSelect.value = 'rating_high';
        sortPosts();
    }
}

// ── Category heading ──────────────────────────────────────────────────────────
function _showCategoryHeading(catId) {
    const name = CATEGORY_NAMES[catId] || `Category ${catId}`;
    let heading = document.getElementById('category-page-heading');
    if (!heading) {
        heading = document.createElement('h2');
        heading.id = 'category-page-heading';
        heading.style.cssText =
            'padding:1.5rem 5%;font-size:1.5rem;color:#2c3e50;border-bottom:2px solid #1877f2;margin-bottom:0';
        postsContainer?.parentNode?.insertBefore(heading, postsContainer);
    }
    heading.textContent = `🗂 ${name}`;
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const currencyToggle = document.getElementById('currencyToggle');
    if (currencyToggle) currencyToggle.addEventListener('click', toggleCurrency);

    const params = new URLSearchParams(window.location.search);
    const catId  = params.get('catId');

    if (catId) {
        await loadServicesByCategory(parseInt(catId, 10));
    } else {
        await loadAllServices();
    }
});

// ── Global: Favourite toggle ──────────────────────────────────────────────────
// Uses data-fav="true|false" written by renderServiceCard to distinguish add vs
// remove without a re-fetch.  Keeps `userFavoriteIds` in sync so any subsequent
// re-render within the same session respects the latest state.
window.addToFavorites = async function (serviceId, btnElement) {
    const user = requireAuth(['client']);
    if (!user) return;

    const numId  = Number(serviceId);
    const isFav  = btnElement?.dataset.fav === 'true';
    const icon   = btnElement?.querySelector('i');
    const method = isFav ? 'DELETE' : 'POST';

    // ── Optimistic UI ─────────────────────────────────────────────────────────
    if (icon) {
        icon.className   = isFav ? 'far fa-heart' : 'fas fa-heart';
        icon.style.color = isFav ? '' : '#ef4444';
    }
    if (btnElement) {
        btnElement.dataset.fav = String(!isFav);
        btnElement.title       = isFav ? 'أضف للمفضلة' : 'إزالة من المفضلة';
        btnElement.ariaLabel   = btnElement.title;
    }

    // ── Optimistic array update ───────────────────────────────────────────────
    if (isFav) {
        userFavoriteIds = userFavoriteIds.filter(id => id !== numId);
    } else {
        if (!userFavoriteIds.includes(numId)) userFavoriteIds.push(numId);
    }

    try {
        await apiFetch(`/api/Favorites/${numId}`, { method });
        // API confirmed — nothing more to do; array is already updated above.
    } catch {
        // ── Revert everything on failure ──────────────────────────────────────
        if (icon) {
            icon.className   = isFav ? 'fas fa-heart' : 'far fa-heart';
            icon.style.color = isFav ? '#ef4444' : '';
        }
        if (btnElement) btnElement.dataset.fav = String(isFav);

        // Revert array
        if (isFav) {
            if (!userFavoriteIds.includes(numId)) userFavoriteIds.push(numId);
        } else {
            userFavoriteIds = userFavoriteIds.filter(id => id !== numId);
        }

        alert(isFav
            ? 'تعذّرت إزالة الخدمة من المفضلة. حاول مجدداً.'
            : 'الخدمة موجودة مسبقاً في المفضلة، أو حدث خطأ.');
    }
};

// ── Internal escape helper ────────────────────────────────────────────────────
function _esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
