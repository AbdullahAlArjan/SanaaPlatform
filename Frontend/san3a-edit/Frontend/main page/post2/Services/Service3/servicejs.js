



// Simulate login status (replace with your actual authentication logic)
let isLoggedIn = false; // Set to false by default
const user = {
    name: "Omar",
    avatar: "image/user.jpg",
};

// DOM Elements
const loginLink = document.getElementById('login-link');
const registerLink = document.getElementById('register-link');
const userProfile = document.getElementById('user-profile');
const userAvatar = document.querySelector('.user-avatar');
const username = document.querySelector('.username');
const submitCommentBtn = document.getElementById('submit-comment');
const commentInput = document.getElementById('comment-input');

// Function to update the UI based on login status
function updateUI() {


    if (isLoggedIn) {
        // Hide login and register links
        loginLink.style.display = 'none';
        registerLink.style.display = 'none';

        // Show user profile
        userProfile.style.display = 'flex';
        userAvatar.src = user.avatar;
        username.textContent = user.name;
    } else {
        // Show login and register links
        loginLink.style.display = 'inline';
        registerLink.style.display = 'inline';

        // Hide user profile
        userProfile.style.display = 'none';
    }
}

// Simulate login (for demonstration purposes)
function login() {
    isLoggedIn = true;
    updateUI();
}

// Simulate logout (for demonstration purposes)
function logout() {
    isLoggedIn = false;
    updateUI();
}

// Update the UI on page load
updateUI();

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

// Place Order Logic
orderButton.addEventListener('click', (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
        loginModal.style.display = 'flex';
    } else {
        document.getElementById('credit-card-modal').style.display = 'flex';
    }
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
document.querySelector('.arrow.next').addEventListener('click', () => {
    currentSlide = (currentSlide + 1) % slides.length;
    showSlide(currentSlide);
});

document.querySelector('.arrow.prev').addEventListener('click', () => {
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