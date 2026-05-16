



const API_BASE_URL = 'https://localhost:7101';

// Read real auth state from localStorage (written by auth.js on login)
const _cu = (() => { try { return JSON.parse(localStorage.getItem('currentUser')); } catch { return null; } })();
let isLoggedIn = Boolean(localStorage.getItem('accessToken') && _cu);
const user = {
    name:   _cu?.fullName || 'User',
    avatar: _cu
        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(_cu.fullName || 'User')}&background=3498db&color=fff`
        : 'Images/m1.png',
};

// DOM Elements
const loginLink = document.getElementById('login-link');
const registerLink = document.getElementById('register-link');
const userProfile = document.getElementById('user-profile');
const userAvatar = document.querySelector('.user-avatar');
const username = document.querySelector('.username');
const submitCommentBtn = document.getElementById('submit-comment');
const commentInput = document.getElementById('comment-input');

// Update the navbar to reflect the current auth state
function updateUI() {
    if (isLoggedIn) {
        loginLink.style.display    = 'none';
        registerLink.style.display = 'none';
        userProfile.style.display  = 'flex';
        userAvatar.src             = user.avatar;
        username.textContent       = user.name;

        // Inject a logout link once so the user can sign out from the service page
        if (!userProfile.querySelector('.svc-logout')) {
            const a = document.createElement('a');
            a.className = 'svc-logout';
            a.href      = '#';
            a.textContent = 'خروج';
            a.style.cssText = 'color:white;margin-right:0.75rem;font-size:0.85rem;text-decoration:underline;cursor:pointer;';
            a.addEventListener('click', (e) => { e.preventDefault(); logout(); });
            userProfile.appendChild(a);
        }
    } else {
        loginLink.style.display    = 'inline';
        registerLink.style.display = 'inline';
        userProfile.style.display  = 'none';
    }
}

function login() { window.location.href = 'Login.html'; }

function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
    window.location.href = 'Login.html';
}

// Update the UI on page load
updateUI();

// ── Favorite: set initial heart state on page load ────────────────────────────
const favBtn = document.getElementById('favorite-btn');
if (favBtn && isLoggedIn) {
    const serviceId = parseInt(favBtn.dataset.serviceId);
    (async () => {
        try {
            const res  = await fetch(`${API_BASE_URL}/api/Favorites`, {
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }
            });
            if (res.ok) {
                const list = await res.json();
                if (Array.isArray(list) && list.some(f => f.ServiceID === serviceId)) {
                    _setFavActive(favBtn, true);
                }
            }
        } catch { /* network error — default to unfilled heart */ }
    })();
}

// Toggle favorite: POST to add, DELETE to remove
window.toggleFavorite = async function (btn) {
    if (!isLoggedIn) { loginModal.style.display = 'flex'; return; }
    const serviceId = parseInt(btn.dataset.serviceId);
    const isFav     = btn.classList.contains('is-favorited');
    const method    = isFav ? 'DELETE' : 'POST';

    try {
        const res = await fetch(`${API_BASE_URL}/api/Favorites/${serviceId}`, {
            method,
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }
        });
        if (res.ok) {
            _setFavActive(btn, !isFav);
        } else {
            alert(isFav ? 'Could not remove from favorites.' : 'Could not add to favorites.');
        }
    } catch { alert('Network error — please try again.'); }
};

function _setFavActive(btn, active) {
    const icon = btn.querySelector('i');
    if (!icon) return;
    icon.className     = active ? 'fas fa-heart' : 'far fa-heart';
    icon.style.color   = active ? '#e74c3c' : '';
    btn.classList.toggle('is-favorited', active);
}

// Comment Submission Functionality
submitCommentBtn.addEventListener('click', function (event) {
    if (!isLoggedIn) {
        event.preventDefault(); // Prevent the default form submission
        loginModal.style.display = 'flex'; // Show the modal
        return; // Exit the function to prevent adding the comment
    }

    const commentText = commentInput.value.trim();

    if (commentText) {
        const commentsList = document.querySelector('.comments-list');

        // Create new comment element
        const newComment = document.createElement('div');
        newComment.classList.add('comment');

        // Add comment author (logged-in user)
        const commentAuthor = document.createElement('div');
        commentAuthor.classList.add('comment-author');
        commentAuthor.innerHTML = `
            <img src="${user.avatar}" alt="User Avatar">
            <span>${user.name}</span>
        `;

        // Add comment text
        const commentTextElement = document.createElement('p');
        commentTextElement.classList.add('comment-text');
        commentTextElement.textContent = commentText;

        // Append elements to new comment
        newComment.appendChild(commentAuthor);
        newComment.appendChild(commentTextElement);

        // Add new comment to the list
        commentsList.prepend(newComment);

        // Clear input
        commentInput.value = '';
    }
});

// Login/Register Modal Functionality
const loginModal = document.getElementById('login-modal');
const closeModalBtn = document.querySelector('.close-modal');

// Close modal when the close button is clicked
closeModalBtn.addEventListener('click', function () {
    loginModal.style.display = 'none';
});

// Close modal when clicking outside the modal
window.addEventListener('click', function (event) {
    if (event.target === loginModal) {
        loginModal.style.display = 'none';
    }
});



// Rating System Functionality
const stars = document.querySelectorAll('.rating .star');
const ratingDisplay = document.querySelector('.rating-display');

// تحديث دالة التقييم
stars.forEach((star, index) => {
    star.addEventListener('click', () => {
        if (!isLoggedIn) {
            loginModal.style.display = 'flex';
            return; // إيقاف العملية إذا لم يكن مسجل دخول
        }

        // الكود الأصلي للتصنيف
        const ratingValue = index + 1;
        stars.forEach((s, i) => {
            s.classList.toggle('active', i <= index);
        });
        ratingDisplay.textContent = `Rating: ${ratingValue}/5`;
    });
});

// إضافة مؤشر مرئي للنجوم غير النشطة
stars.forEach(star => {
    star.addEventListener('mouseover', () => {
        if (!isLoggedIn) {
            star.style.cursor = 'not-allowed';
            star.style.opacity = '0.5';
        }
    });
    
    star.addEventListener('mouseout', () => {
        if (!isLoggedIn) {
            star.style.cursor = 'default';
            star.style.opacity = '1';
        }
    });
});

// Interactive Buttons
const buttons = document.querySelectorAll('.btn');
buttons.forEach(button => {
    button.addEventListener('mouseenter', () => {
        button.style.transform = 'scale(1.05)';
    });
    button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
    });
});

// Get Buttons
const messageButton = document.getElementById('message-button');
const orderButton = document.querySelector('.btn-order');
const reportButton = document.querySelector('.btn-report');

// WhatsApp Redirection
messageButton.addEventListener('click', () => {
    window.location.href = "https://wa.me/1234567890"; // استبدل بالرقم الفعلي
});

// Place Order — POST /api/Orders
orderButton.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!isLoggedIn) { loginModal.style.display = 'flex'; return; }

    const serviceId    = parseInt(document.body.dataset.serviceId    || 0);
    const freelancerId = parseInt(document.body.dataset.freelancerId || 0);
    const location     = prompt('Enter your location / address for this order:');
    if (!location) return; // user cancelled

    try {
        const res = await fetch(`${API_BASE_URL}/api/Orders`, {
            method: 'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('accessToken')
            },
            body: JSON.stringify({
                freelancerID: freelancerId, // CreateOrderRequest.freelancerID (int)
                serviceID:    serviceId,    // CreateOrderRequest.serviceID (int)
                description:  '',
                location:     location
            })
        });

        if (res.ok) {
            alert('تم إرسال الطلب للصنايعي بنجاح! 🚀');
        } else {
            const err = await res.json().catch(() => ({}));
            alert(err.message || 'Failed to place order. Please try again.');
        }
    } catch { alert('Network error — is the backend running?'); }
});

// Report Logic
reportButton.addEventListener('click', (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
        loginModal.style.display = 'flex';
    } else {
        document.getElementById('report-modal').style.display = 'flex';
    }
});

// Handle Credit Card Form Submission
document.getElementById('payment-form').addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Payment processed successfully!');
    document.getElementById('credit-card-modal').style.display = 'none';
});

// Handle Report Form Submission
document.getElementById('report-form').addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Report submitted successfully!');
    document.getElementById('report-modal').style.display = 'none';
});

// Close Modals for new popups
document.querySelectorAll('.close-modal').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
        closeBtn.closest('.modal').style.display = 'none';
    });
});

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});



// Auto-format expiration date
document.querySelector('input[placeholder="MM/YY"]').addEventListener('input', function(e) {
    let value = this.value.replace(/\D/g, '');
    if (value.length > 2) {
        this.value = value.slice(0, 2) + '/' + value.slice(2, 4);
    }
});



// Back button handler
document.querySelector('.btn-back').addEventListener('click', () => {
    document.getElementById('credit-card-modal').style.display = 'none';
});

// Form submission
document.getElementById('payment-form').addEventListener('submit', (e) => {
    e.preventDefault();
    // Add payment processing logic here
    alert('Payment successful!');
    document.getElementById('credit-card-modal').style.display = 'none';
});

// Optional file input
document.querySelector('#report-modal input[type="file"]').addEventListener('change', function(e) {
    if (this.files[0].size > 5 * 1024 * 1024) { // 5MB limit
        alert('File size exceeds 5MB limit');
        this.value = '';
    }
});


// Card Number Formatting and Validation
const cardNumberInput = document.getElementById('card-number');

cardNumberInput.addEventListener('input', function(e) {
    // السماح بأرقام ومسافات فقط
    let value = this.value.replace(/[^\d ]/g, '');
    
    // إضافة مسافات كل 4 أرقام
    value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    
    // تقليل الطول الأقصى إلى 19 حرف (16 رقم + 3 مسافات)
    this.value = value.substring(0, 19);
});
// التحقق قبل الإرسال
document.getElementById('payment-form').addEventListener('submit', function(e) {
    // إزالة المسافات للتحقق من الأرقام
    const rawNumber = cardNumberInput.value.replace(/ /g, '');
    
    if (rawNumber.length !== 16) {
        cardNumberInput.setCustomValidity('يجب إدخال 16 رقمًا');
        cardNumberInput.reportValidity();
        e.preventDefault();
        return;
    }
    
    cardNumberInput.setCustomValidity('');
});

// CVV Validation
document.querySelector('input[placeholder="CVC"]').addEventListener('input', function(e) {
    this.value = this.value.replace(/\D/g, '').substring(0, 3);
});

// Name on Card Validation
document.querySelector('input[placeholder="Name"]').addEventListener('input', function(e) {
    this.value = this.value.replace(/[^A-Za-z ]/g, '');
});

// Expiration Date Validation (existing code)
document.querySelector('input[placeholder="MM/YY"]').addEventListener('input', function(e) {
    let value = this.value.replace(/\D/g, '');
    if (value.length > 2) {
        this.value = value.slice(0, 2) + '/' + value.slice(2, 4);
    }
    this.value = this.value.substring(0, 5);
});
// Issue Description Validation
document.querySelector('#report-form textarea').addEventListener('input', function(e) {
    this.value = this.value.replace(/[0-9]/g, '');
});




// Gallery Functionality
let currentSlide = 0;
const slides = document.querySelectorAll('.slides-container img');
const thumbs = document.querySelectorAll('.thumbnails img');

function showSlide(index) {
    // إخفاء جميع الصور
    slides.forEach(slide => slide.classList.remove('active'));
    thumbs.forEach(thumb => thumb.classList.remove('active'));
    
    // إظهار الصورة المحددة
    slides[index].classList.add('active');
    thumbs[index].classList.add('active');
}

// التنقل بالأسهم
document.querySelector('.arrow.prev').addEventListener('click', () => {
    currentSlide = (currentSlide + 1) % slides.length;
    showSlide(currentSlide);
});

document.querySelector('.arrow.next').addEventListener('click', () => {
    currentSlide = (currentSlide - 1 + slides.length) % slides.length;
    showSlide(currentSlide);
});

// التنقل بالصور المصغرة
thumbs.forEach((thumb, index) => {
    thumb.addEventListener('click', () => {
        currentSlide = index;
        showSlide(currentSlide);
    });
});