// servicejs.js - Main JavaScript for Service Page

// User Authentication State
let currentUser = null;
const authToken = localStorage.getItem('authToken');

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication status
    checkAuthStatus();
    
    // Initialize components based on current page
    if (document.querySelector('.service-images')) {
        initImageGallery();
    }
    
    if (document.getElementById('submit-comment')) {
        initCommentSystem();
    }
    
    if (document.getElementById('message-button')) {
        initMessaging();
    }
    
    // Initialize forms if they exist on the page
    if (document.getElementById('order-form')) {
        initOrderForm();
    }
    
    if (document.getElementById('report-form')) {
        initReportForm();
    }
    
    if (document.getElementById('rating-form')) {
        initRatingSystem();
    }
});

// Authentication Functions
function checkAuthStatus() {
    if (authToken) {
        // In a real app, you would verify the token with your backend
        currentUser = {
            name: localStorage.getItem('userName') || 'User',
            avatar: localStorage.getItem('userAvatar') || 'image/user.jpg',
            id: localStorage.getItem('userId')
        };
        updateAuthUI();
    }
}

function updateAuthUI() {
    const loginLink = document.getElementById('login-link');
    const registerLink = document.getElementById('register-link');
    const userProfile = document.getElementById('user-profile');
    
    if (currentUser) {
        if (loginLink) loginLink.style.display = 'none';
        if (registerLink) registerLink.style.display = 'none';
        if (userProfile) {
            userProfile.style.display = 'flex';
            document.querySelector('.user-avatar').src = currentUser.avatar;
            document.querySelector('.username').textContent = currentUser.name;
        }
    } else {
        if (loginLink) loginLink.style.display = 'inline';
        if (registerLink) registerLink.style.display = 'inline';
        if (userProfile) userProfile.style.display = 'none';
    }
}

// Image Gallery Functionality
function initImageGallery() {
    let currentSlide = 0;
    const slides = document.querySelectorAll('.slides-container img');
    const thumbs = document.querySelectorAll('.thumbnails img');
    const prevBtn = document.querySelector('.arrow.prev');
    const nextBtn = document.querySelector('.arrow.next');

    function showSlide(index) {
        slides.forEach(slide => slide.classList.remove('active'));
        thumbs.forEach(thumb => thumb.classList.remove('active'));
        
        slides[index].classList.add('active');
        thumbs[index].classList.add('active');
        currentSlide = index;
    }

    // Navigation with arrows
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            showSlide((currentSlide + 1) % slides.length);
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            showSlide((currentSlide - 1 + slides.length) % slides.length);
        });
    }

    // Navigation with thumbnails
    thumbs.forEach((thumb, index) => {
        thumb.addEventListener('click', () => showSlide(index));
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
            showSlide((currentSlide + 1) % slides.length);
        } else if (e.key === 'ArrowLeft') {
            showSlide((currentSlide - 1 + slides.length) % slides.length);
        }
    });
}

// Comment System
function initCommentSystem() {
    const submitBtn = document.getElementById('submit-comment');
    const commentInput = document.getElementById('comment-input');
    
    if (submitBtn && commentInput) {
        submitBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            if (!currentUser) {
                window.location.href = '../../../../main page/Login/Login.html?redirect=' + encodeURIComponent(window.location.pathname);
                return;
            }
            
            const commentText = commentInput.value.trim();
            if (commentText) {
                addComment(commentText);
                commentInput.value = '';
            }
        });
    }
}

function addComment(text) {
    const commentsList = document.querySelector('.comments-list');
    if (!commentsList) return;
    
    const now = new Date();
    const commentDate = now.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
    
    const newComment = document.createElement('div');
    newComment.classList.add('comment');
    newComment.innerHTML = `
        <div class="comment-author">
            <img src="${currentUser.avatar}" alt="${currentUser.name}">
            <div class="author-info">
                <span class="name">${currentUser.name}</span>
                <span class="date">${commentDate}</span>
            </div>
        </div>
        <p class="comment-text">${text}</p>
    `;
    
    commentsList.prepend(newComment);
    
    // In a real app, you would send the comment to your backend here
    console.log('New comment added:', text);
}

// Messaging System - WhatsApp Integration
function initMessaging() {
    const messageButton = document.getElementById('message-button');
    if (messageButton) {
        messageButton.addEventListener('click', function() {
            if (!currentUser) {
                window.location.href = '../../../../main page/Login/Login.html?redirect=' + encodeURIComponent(window.location.pathname);
                return;
            }
            
            // Get freelancer details from the page
            const freelancerName = document.querySelector('.owner-info h3').textContent.trim();
            const serviceName = document.querySelector('.service-info h1').textContent.trim();
            const freelancerPhone = "962791234567"; // Jordan number format (replace with actual freelancer's WhatsApp number)
            
            // Create WhatsApp message with context
            const message = `Hello ${freelancerName},\n\nI'm interested in your "${serviceName}" service on Sana'a. Could you please provide more information?\n\nBest regards,\n${currentUser.name}`;
            
            // Encode the message for URL
            const encodedMessage = encodeURIComponent(message);
            
            // Open WhatsApp with the message
            window.open(`https://wa.me/${freelancerPhone}?text=${encodedMessage}`, '_blank');
        });
    }
}

// Order Form (for place-order.html)
function initOrderForm() {
    const orderForm = document.getElementById('order-form');
    if (!orderForm) return;
    
    const deliverySelect = document.getElementById('delivery-time');
    const totalDisplay = document.querySelector('.order-summary .total span:last-child');
    const basePrice = 70; // This should come from the service data
    
    // Update price when delivery time changes
    if (deliverySelect) {
        deliverySelect.addEventListener('change', function() {
            const expressFee = this.value === '1' ? 40 : (this.value === '2' ? 20 : 0);
            const total = basePrice + expressFee;
            if (totalDisplay) {
                totalDisplay.textContent = `$${total.toFixed(2)}`;
            }
            
            // Update express delivery line
            const expressLine = document.querySelector('.summary-item:nth-child(2) span:last-child');
            if (expressLine) {
                expressLine.textContent = `$${expressFee.toFixed(2)}`;
            }
        });
    }
    
    // Form submission
    orderForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!currentUser) {
            window.location.href = '../../../../main page/Login/Login.html?redirect=' + encodeURIComponent(window.location.pathname);
            return;
        }
        
        const orderData = {
            serviceId: 'logo-design', // Should be dynamic
            requirements: document.getElementById('order-requirements').value,
            deliveryTime: deliverySelect.value,
            cardLastFour: document.getElementById('card-number').value.slice(-4),
            total: parseFloat(totalDisplay.textContent.replace('$', ''))
        };
        
        // In a real app, you would send this to your backend
        console.log('Order submitted:', orderData);
        alert('Order placed successfully!');
        window.location.href = '../Service.html';
    });
    
    // Credit card formatting
    const cardNumberInput = document.getElementById('card-number');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function() {
            let value = this.value.replace(/\D/g, '');
            value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
            this.value = value.substring(0, 19);
        });
    }
}

// Report Form (for report-service.html)
function initReportForm() {
    const reportForm = document.getElementById('report-form');
    if (!reportForm) return;
    
    reportForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!currentUser) {
            window.location.href = '../../../../main page/Login/Login.html?redirect=' + encodeURIComponent(window.location.pathname);
            return;
        }
        
        const reportData = {
            serviceId: 'logo-design', // Should be dynamic
            reason: document.getElementById('report-reason').value,
            details: document.getElementById('report-details').value,
            attachment: document.getElementById('report-attachment').files[0]?.name || null,
            reportedBy: currentUser.id
        };
        
        // In a real app, you would send this to your backend
        console.log('Report submitted:', reportData);
        alert('Thank you for your report. We will review it shortly.');
        window.location.href = '../Service.html';
    });
    
    // File size validation
    const fileInput = document.getElementById('report-attachment');
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            if (this.files[0]?.size > 5 * 1024 * 1024) { // 5MB
                alert('File size exceeds 5MB limit');
                this.value = '';
            }
        });
    }
}

// Rating System (for rate-service.html)
function initRatingSystem() {
    const ratingForm = document.getElementById('rating-form');
    if (!ratingForm) return;
    
    const stars = ratingForm.querySelectorAll('.rating-stars input');
    let selectedRating = 0;
    
    stars.forEach(star => {
        star.addEventListener('change', function() {
            selectedRating = parseInt(this.value);
            updateStarDisplay(selectedRating);
        });
    });
    
    ratingForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!currentUser) {
            window.location.href = '../../../../main page/Login/Login.html?redirect=' + encodeURIComponent(window.location.pathname);
            return;
        }
        
        if (selectedRating === 0) {
            alert('Please select a rating');
            return;
        }
        
        const ratingData = {
            serviceId: 'logo-design', // Should be dynamic
            rating: selectedRating,
            comment: document.getElementById('rating-comment').value.trim(),
            userId: currentUser.id
        };
        
        // In a real app, you would send this to your backend
        console.log('Rating submitted:', ratingData);
        alert(`Thank you for your ${selectedRating}-star rating!`);
        window.location.href = '../Service.html';
    });
}

function updateStarDisplay(rating) {
    const stars = document.querySelectorAll('.rating-stars label');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.style.color = '#FFD700'; // Gold color for selected stars
        } else {
            star.style.color = '#ddd'; // Default color for unselected stars
        }
    });
}

// Utility function to get URL parameter
function getUrlParameter(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

// Check for redirect parameter after login
if (getUrlParameter('loggedIn') === 'true') {
    checkAuthStatus();
}