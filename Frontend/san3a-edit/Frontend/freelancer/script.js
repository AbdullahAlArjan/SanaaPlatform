// script.js
document.addEventListener('DOMContentLoaded', () => {
    // Application State
    const appState = {
        services: [
            { name: 'Logo Design', price: 150, buyers: 85, availability: 'active' },
            { name: 'Web Design', price: 500, buyers: 45, availability: 'deactive' },
            { name: 'Social Media Design', price: 100, buyers: 30, availability: 'active' }
        ],
        orders: [
            { customer: 'John Doe', service: 'Logo Design' },
            { customer: 'Jane Smith', service: 'Web Design' },
            { customer: 'Ahmed Ali', service: 'Social Media Design' }
        ]
    };

    // Modal Service Module
    const modalService = {
        init() {
            window.openModal = this.open.bind(this);
            window.closeModal = this.close.bind(this);
            document.addEventListener('click', this.handleOutsideClick.bind(this));
        },

        open(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) modal.style.display = 'flex';
        },

        close(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) modal.style.display = 'none';
        },

        handleOutsideClick(event) {
            if (event.target.classList.contains('modal')) {
                this.close(event.target.id);
            }
        }
    };

    // Notification Service Module
    const notificationService = {
        init() {
            this.notificationIcon = document.querySelector('.notification-icon');
            this.notificationDropdown = document.querySelector('.notification-dropdown');
            this.setupEventListeners();
        },

        setupEventListeners() {
            this.notificationIcon.addEventListener('click', (e) => this.toggleDropdown(e));
            document.addEventListener('click', (e) => this.closeDropdown(e));
            document.querySelector('.mark-all-read').addEventListener('click', () => this.markAllRead());
        },

        toggleDropdown(e) {
            e.stopPropagation();
            this.notificationDropdown.classList.toggle('active');
        },

        closeDropdown(e) {
            if (!this.notificationIcon.contains(e.target)) {
                this.notificationDropdown.classList.remove('active');
            }
        },

        markAllRead() {
            document.querySelectorAll('.notification-item.unread').forEach(item => {
                item.classList.remove('unread');
            });
            document.querySelector('.notification-badge').style.display = 'none';
            this.notificationDropdown.classList.remove('active');
        }
    };

    // Profile Service Module
    const profileService = {
        init() {
            this.setupProfileForm();
            this.setupDescriptionForm();
        },

        setupProfileForm() {
            document.getElementById('edit-profile-form').addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateProfile();
                modalService.close('edit-profile-modal');
            });
        },

        setupDescriptionForm() {
            document.getElementById('edit-description-form').addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateDescription();
                modalService.close('edit-description-modal');
            });
        },

        updateProfile() {
            const location = document.getElementById('profile-location').value;
            document.querySelector('.profile-info p:nth-child(1)').innerHTML = 
                `<i class="fas fa-map-marker-alt"></i> ${location}`;

            const fileInput = document.getElementById('profile-picture');
            if (fileInput.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.querySelector('.profile-pic').src = e.target.result;
                };
                reader.readAsDataURL(fileInput.files[0]);
            }
        },

        updateDescription() {
            const newDescription = document.getElementById('description-text').value;
            document.getElementById('profile-description').textContent = newDescription;
        }
    };

    // Order Service Module
    const orderService = {
        init() {
            this.renderOrders();
            this.setupEventDelegation();
        },

        renderOrders() {
            const container = document.getElementById('order-list-container');
            container.innerHTML = appState.orders.map((order, index) => `
                <div class="order-item">
                    <span>Customer: ${order.customer}</span>
                    <span>Service: ${order.service}</span>
                    <div class="order-actions">
                        <button class="btn btn-accept" data-index="${index}">Accept</button>
                        <button class="btn btn-reject" data-index="${index}">Reject</button>
                    </div>
                </div>
            `).join('');
        },

        setupEventDelegation() {
            document.getElementById('order-list-container').addEventListener('click', (e) => {
                const index = e.target.dataset.index;
                if (e.target.classList.contains('btn-accept')) this.acceptOrder(index);
                if (e.target.classList.contains('btn-reject')) this.rejectOrder(index);
            });
        },

        acceptOrder(index) {
            alert(`Accepted order from ${appState.orders[index].customer}`);
            appState.orders.splice(index, 1);
            this.renderOrders();
        },

        rejectOrder(index) {
            alert(`Rejected order from ${appState.orders[index].customer}`);
            appState.orders.splice(index, 1);
            this.renderOrders();
        }
    };

   // Service Management Module
const serviceManager = {
    init() {
        this.renderAllServices();
        this.setupServiceForms();
        this.setupEventDelegation();
    },

    renderAllServices() {
        this.renderServicesList();
        this.renderManageServices();
    },

    renderServicesList() {
        const container = document.getElementById('services-list');
        container.innerHTML = appState.services.map(service => `
            <div class="service-item">
                <span>${service.name}</span>
                <div class="service-meta">
                    <span>$${service.price}</span>
                    <small>${service.buyers} buyers</small>
                    <div class="availability-status ${service.availability}">
                        ${service.availability === 'active' ? 'Active' : 'Deactive'}
                    </div>
                </div>
            </div>
        `).join('');
    },

    renderManageServices() {
        const container = document.getElementById('manage-services-container');
        container.innerHTML = appState.services.map((service, index) => `
            <div class="service-item">
                <div class="service-inputs">
                    <label for="service-name-${index}">Service Name:</label>
                    <input type="text" id="service-name-${index}" class="service-name-input" value="${service.name}" data-index="${index}">
                    <label for="service-price-${index}">Price ($):</label>
                    <input type="number" id="service-price-${index}" class="service-price-input" value="${service.price}" data-index="${index}">
                </div>
                <div class="service-actions">
                    <button class="btn btn-save" data-index="${index}">Save</button>
                    <button class="btn btn-drop" data-index="${index}">Drop</button>
                    <button class="toggle-button ${service.availability}" data-index="${index}">
                        ${service.availability === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                </div>
            </div>
        `).join('');
    },

    setupServiceForms() {
        document.getElementById('post-service-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleNewService();
            modalService.close('post-service-modal');
        });
    },

    setupEventDelegation() {
        document.getElementById('manage-services-container').addEventListener('click', (e) => {
            const index = e.target.dataset.index;
            if (e.target.classList.contains('toggle-button')) this.toggleAvailability(index);
            if (e.target.classList.contains('btn-save')) this.saveServiceChanges(index);
            if (e.target.classList.contains('btn-drop')) this.dropService(index);
        });
    },

    handleNewService() {
        const newService = {
            name: document.getElementById('service-name').value,
            price: document.getElementById('service-price').value,
            buyers: 0,
            availability: document.getElementById('service-availability').value
        };
        appState.services.push(newService);
        this.renderAllServices();
        document.getElementById('post-service-form').reset();
    },

    toggleAvailability(index) {
        appState.services[index].availability = 
            appState.services[index].availability === 'active' ? 'deactive' : 'active';
        this.renderAllServices();
    },

    saveServiceChanges(index) {
        const nameInput = document.querySelector(`.service-name-input[data-index="${index}"]`);
        const priceInput = document.querySelector(`.service-price-input[data-index="${index}"]`);
        appState.services[index].name = nameInput.value;
        appState.services[index].price = priceInput.value;
        this.renderAllServices();
        alert('Service updated successfully!');
    },

    dropService(index) {
        if (confirm('Are you sure you want to drop this service?')) {
            appState.services.splice(index, 1);
            this.renderAllServices();
            alert('Service dropped successfully!');
        }
    }
};
    // WhatsApp Integration
    window.openWhatsApp = () => {
        const phoneNumber = '+962797037825';
        const message = 'Hello, I found you on Sana\'a!';
        window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
    };

    // Image Preview Handler
    window.previewProfilePicture = (event) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('profile-picture-preview').src = e.target.result;
        };
        reader.readAsDataURL(event.target.files[0]);
    };

    // Initialize All Modules
    modalService.init();
    notificationService.init();
    profileService.init();
    orderService.init();
    serviceManager.init();
});

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function openWhatsApp() {
    window.open('https://wa.me/962797037825', '_blank');
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.className === 'modal') {
        event.target.style.display = 'none';
    }
}
document.addEventListener("DOMContentLoaded", function () {
    const testimonialItems = document.querySelectorAll(".testimonial-item");
    const carouselContainer = document.querySelector(".testimonial-carousel");
    let currentIndex = 0;

    // Function to show the current testimonial
    function showTestimonial(index) {
        testimonialItems.forEach((item, i) => {
            item.classList.remove("active");
            if (i === index) {
                setTimeout(() => {
                    item.classList.add("active");
                }, 10); // Small delay to trigger CSS transition
            }
        });
    }

    // Function to move to the next testimonial
    function nextTestimonial() {
        currentIndex = (currentIndex + 1) % testimonialItems.length;
        showTestimonial(currentIndex);
    }

    // Function to move to the previous testimonial
    function prevTestimonial() {
        currentIndex = (currentIndex - 1 + testimonialItems.length) % testimonialItems.length;
        showTestimonial(currentIndex);
    }

    // Add navigation buttons dynamically
    const navButtons = `
        <div class="carousel-nav">
            <button class="nav-btn prev-btn">
                <i class="fas fa-chevron-left"></i>
            </button>
            <button class="nav-btn next-btn">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
    carouselContainer.insertAdjacentHTML("beforeend", navButtons);

    // Attach event listeners to the buttons
    const prevButton = document.querySelector(".prev-btn");
    const nextButton = document.querySelector(".next-btn");

    prevButton.addEventListener("click", prevTestimonial);
    nextButton.addEventListener("click", nextTestimonial);

    // Show the first testimonial initially
    showTestimonial(currentIndex);

    // Auto-rotate testimonials every 5 seconds
    let autoRotate = setInterval(nextTestimonial, 5000);

    // Pause auto-rotation on hover
    carouselContainer.addEventListener("mouseenter", () => {
        clearInterval(autoRotate);
    });

    // Resume auto-rotation on mouse leave
    carouselContainer.addEventListener("mouseleave", () => {
        autoRotate = setInterval(nextTestimonial, 5000);
    });
});

document.addEventListener('DOMContentLoaded', () => {
    // Retrieve freelancer data from localStorage
    const freelancerData = JSON.parse(localStorage.getItem('freelancerData'));

    if (freelancerData) {
        // Update Basic Profile Info
        const professionElement = document.querySelector('.profession');
        const locationElement = document.querySelector('.profile-info p:nth-child(1)');
        const ageElement = document.querySelector('.profile-info p:nth-child(2)');

        if (professionElement) professionElement.textContent = freelancerData.profession;
        if (locationElement) locationElement.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${freelancerData.address}`;
        if (ageElement) ageElement.innerHTML = `<i class="fas fa-birthday-cake"></i> ${freelancerData.age} years old`;

        // Add CV/Work Samples Section
        const profileCard = document.querySelector('.profile-card');
        if (profileCard) {
            // Remove existing file info if present
            const existingFileInfo = profileCard.querySelectorAll('.file-info');
            existingFileInfo.forEach(el => el.remove());

            // Add CV info
            const cvInfo = document.createElement('div');
            cvInfo.className = 'file-info';
            cvInfo.innerHTML = `
                <i class="fas fa-file-pdf"></i>
                <span>CV: ${freelancerData.cv}</span>
            `;
            profileCard.insertBefore(cvInfo, profileCard.querySelector('.action-buttons'));

            // Add Work Samples info
            const workSamplesInfo = document.createElement('div');
            workSamplesInfo.className = 'file-info';
            workSamplesInfo.innerHTML = `
                <i class="fas fa-file-archive"></i>
                <span>Work Samples: ${freelancerData.workSamples}</span>
            `;
            profileCard.insertBefore(workSamplesInfo, profileCard.querySelector('.action-buttons'));
        }
    }

    // Edit Profile Modal Logic
    const editProfileForm = document.getElementById('edit-profile-form');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newLocation = document.getElementById('profile-location').value;
            document.querySelector('.profile-info p:nth-child(1)').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${newLocation}`;
            closeModal('edit-profile-modal');
        });
    }

    // Edit Description Modal Logic
    const editDescriptionForm = document.getElementById('edit-description-form');
    if (editDescriptionForm) {
        editDescriptionForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newDescription = document.getElementById('description-text').value;
            document.getElementById('profile-description').textContent = newDescription;
            closeModal('edit-description-modal');
        });
    }
});

// Modal Functions
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// WhatsApp Function
function openWhatsApp() {
    window.open('https://wa.me/+962797037825', '_blank');
}

// Profile Picture Preview
function previewProfilePicture(event) {
    const reader = new FileReader();
    reader.onload = function() {
        const preview = document.getElementById('profile-picture-preview');
        preview.src = reader.result;
    };
    reader.readAsDataURL(event.target.files[0]);
}


// Get DOM elements
const notificationIcon = document.getElementById('notificationIcon');
const notificationDropdown = document.getElementById('notificationDropdown');
const notificationCount = document.getElementById('notificationCount');
const notificationList = document.getElementById('notificationList');
const markAllRead = document.getElementById('markAllRead');

// Toggle dropdown visibility
notificationIcon.addEventListener('click', () => {
    notificationDropdown.style.display = notificationDropdown.style.display === 'block' ? 'none' : 'block';
});

// Mark all notifications as read
markAllRead.addEventListener('click', () => {
    const unreadNotifications = notificationList.querySelectorAll('.unread');
    unreadNotifications.forEach(notification => {
        notification.classList.remove('unread');
    });
    updateNotificationCount(0); // Reset count to 0
});

// Update notification count
function updateNotificationCount(count) {
    notificationCount.textContent = count;
    if (count === 0) {
        notificationCount.style.display = 'none'; // Hide count if no notifications
    } else {
        notificationCount.style.display = 'inline-block';
    }
}

// Example: Add a new notification dynamically
function addNotification(message) {
    const newNotification = document.createElement('div');
    newNotification.classList.add('notification-item', 'unread');
    newNotification.innerHTML = `<p>${message}</p>`;
    notificationList.prepend(newNotification); // Add to the top of the list
    updateNotificationCount(parseInt(notificationCount.textContent) + 1); // Increment count
}

// Example usage:
// addNotification("New message from Client B");


