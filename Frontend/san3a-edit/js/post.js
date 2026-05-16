import { requireAuth } from './auth.js';
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

// Fallback images mapped to category IDs
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

// ── Sort ──────────────────────────────────────────────────────────────────────
// Always queries the DOM fresh so it works with both static and dynamically
// rendered cards.
function sortPosts() {
    if (!postsContainer || !sortSelect) return;
    const cards     = Array.from(postsContainer.querySelectorAll('.post-card'));
    const sortValue = sortSelect.value;

    cards.sort((a, b) => {
        const aRating = parseFloat(a.dataset.rating)  || 0;
        const bRating = parseFloat(b.dataset.rating)  || 0;
        const aPrice  = parseFloat(a.dataset.price)   || 0;
        const bPrice  = parseFloat(b.dataset.price)   || 0;

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

// ── Dynamic service rendering ─────────────────────────────────────────────────

/**
 * Renders a single service card matching the existing .post-card HTML structure.
 * Uses the categoryId for a contextual fallback image.
 */
function renderServiceCard(service, catId) {
    const img   = CATEGORY_IMAGES[catId] || 'Images/logo.png';
    const price = parseFloat(service.basePrice ?? 0);
    const title = service.title || 'Untitled Service';
    const desc  = (service.description || '').slice(0, 80) +
                  (service.description?.length > 80 ? '…' : '');
    const id    = service.serviceID ?? service.serviceId ?? 0;

    // Wrap the entire card in <a href="..."> so clicking anywhere navigates
    // to the dynamic service-details page. The favourite button uses
    // event.stopPropagation() to prevent the link from firing.
    return `
        <a href="service-details.html?id=${id}" class="post-card"
           data-rating="0" data-price="${price}"
           style="text-decoration:none;color:inherit;">
            <img src="${img}" alt="${title}" class="post-image"
                 onerror="this.src='Images/logo.png'">
            <div class="post-details">
                <h3>${title}</h3>
                <div class="price-rating">
                    <span class="price">${price}$</span>
                    <div class="rating">⭐ —</div>
                    <button class="fav-btn"
                            onclick="addToFavorites(${id}, this); event.stopPropagation();"
                            aria-label="أضف للمفضلة">
                        <i class="far fa-heart"></i>
                    </button>
                </div>
                ${desc ? `<p class="service-desc" style="font-size:.8rem;color:#666;margin-top:.4rem">${desc}</p>` : ''}
                <div class="provider-info">
                    <i class="fas fa-tag" style="color:#1877f2"></i>
                    <span>${CATEGORY_NAMES[catId] || 'General'}</span>
                </div>
            </div>
        </a>`;
}

/**
 * Fetches services for the given category from the API and renders them.
 * Falls back to a friendly message if the API returns nothing.
 */
async function loadServicesByCategory(catId) {
    if (!postsContainer) return;

    // Show category heading above the grid
    _showCategoryHeading(catId);

    postsContainer.innerHTML =
        '<p style="text-align:center;padding:3rem;color:#666">جاري التحميل…</p>';

    try {
        const data = await apiJSON(`/api/Services?categoryId=${catId}`);
        // Handle both plain array and paginated wrapper { data: [], total: n }
        const services = Array.isArray(data) ? data : (data.data ?? data.items ?? []);

        if (!services.length) {
            postsContainer.innerHTML =
                `<p style="text-align:center;padding:3rem;color:#888">
                    لا توجد خدمات في هذه الفئة بعد.
                 </p>`;
            return;
        }

        postsContainer.innerHTML = services.map(s => renderServiceCard(s, catId)).join('');

        // Wire sort after dynamic render
        sortPosts();

    } catch (err) {
        console.error('[post.js] Service load error:', err);
        postsContainer.innerHTML =
            `<p style="text-align:center;padding:3rem;color:#e74c3c">
                خطأ أثناء التحميل: ${err.message}
             </p>`;
    }
}

/**
 * loadAllServices — no catId in the URL; loads every active service from the DB
 * and renders them into the grid. Falls back to the static HTML cards on error.
 */
async function loadAllServices() {
    if (!postsContainer) return;

    postsContainer.innerHTML =
        '<p style="text-align:center;padding:3rem;color:#666">جاري التحميل…</p>';

    try {
        const data     = await apiJSON('/api/Services');
        const services = Array.isArray(data) ? data : (data.data ?? data.items ?? []);

        if (!services.length) {
            postsContainer.innerHTML =
                '<p style="text-align:center;padding:3rem;color:#888">لا توجد خدمات متاحة حالياً.</p>';
            return;
        }

        postsContainer.innerHTML = services
            .map(s => renderServiceCard(s, s.categoryID ?? 0))
            .join('');
        sortPosts();

    } catch (err) {
        console.warn('[post.js] API unavailable, using static cards:', err.message);
        // Static HTML cards are already in the DOM from post.html — just sort them
        sortSelect.value = 'rating_high';
        sortPosts();
    }
}

/** Inserts or updates a category heading above the services grid. */
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
    // Wire currency toggle
    const currencyToggle = document.getElementById('currencyToggle');
    if (currencyToggle) currencyToggle.addEventListener('click', toggleCurrency);

    // Check for category filter in the URL query string
    const params = new URLSearchParams(window.location.search);
    const catId  = params.get('catId');

    if (catId) {
        // Filtered mode: fetch only this category's services
        await loadServicesByCategory(parseInt(catId, 10));
    } else {
        // All-services mode: fetch everything from the DB
        await loadAllServices();
    }
});

// ── Global: Add to Favourites ─────────────────────────────────────────────────
window.addToFavorites = async function (serviceId, btnElement) {
    const user = requireAuth(['client']);
    if (!user) return;

    try {
        await apiFetch(`/api/Favorites/${serviceId}`, { method: 'POST' });
        if (btnElement) {
            const icon = btnElement.querySelector('i');
            if (icon) {
                icon.classList.replace('far', 'fas');
                icon.style.color = '#e74c3c';
            }
        }
        alert('تمت إضافة الخدمة للمفضلة بنجاح! ❤️');
    } catch {
        alert('الخدمة موجودة مسبقاً في المفضلة، أو حدث خطأ.');
    }
};
