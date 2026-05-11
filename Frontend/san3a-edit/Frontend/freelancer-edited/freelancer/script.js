document.addEventListener('DOMContentLoaded', () => {
    // Initialize profile data
    initializeProfileData();
    
    // Initialize notification service if on main page
    if (document.getElementById('notificationIcon')) {
        notificationService.init();
    }
    
    // Initialize profile service if on edit profile page
    if (document.getElementById('edit-profile-form')) {
        profileService.init();
    }
    
    // Initialize services if on manage services page
    if (document.getElementById('manage-services-container')) {
        serviceManager.init();
        orderService.init();
    }
    
    // Initialize post service form if on post service page
    if (document.getElementById('post-service-form')) {
        serviceManager.init();
    }
});

// Initialize profile data from local storage
function initializeProfileData() {
    // Retrieve data from local storage
    const fullName = localStorage.getItem('fullName');
    const phoneNumber = localStorage.getItem('phoneNumber');
    const age = localStorage.getItem('age');
    const freelancerData = JSON.parse(localStorage.getItem('freelancerData'));
    const profilePicture = localStorage.getItem('profilePicture');

    // Populate profile data where elements exist
    if (fullName && document.getElementById('fullName')) {
        document.getElementById('fullName').textContent = fullName;
    }
    if (phoneNumber && document.getElementById('phoneNumber')) {
        document.getElementById('phoneNumber').textContent = phoneNumber;
    }
    if (age && document.getElementById('age')) {
        document.getElementById('age').textContent = age;
    }
    if (profilePicture && document.getElementById('profilePicture')) {
        document.getElementById('profilePicture').src = profilePicture;
    }

    // Populate freelancer-specific data where elements exist
    if (freelancerData) {
        if (document.getElementById('profession')) {
            document.getElementById('profession').textContent = freelancerData.profession;
        }
        if (document.getElementById('address')) {
            document.getElementById('address').textContent = freelancerData.address;
        }
        if (document.getElementById('profile-description')) {
            document.getElementById('profile-description').textContent = freelancerData.description;
        }
        if (document.getElementById('profile-location')) {
            document.getElementById('profile-location').value = freelancerData.address || '';
        }
        if (document.getElementById('profile-profession')) {
            document.getElementById('profile-profession').value = freelancerData.profession || '';
        }
        if (document.getElementById('profile-description')) {
            document.getElementById('profile-description').value = freelancerData.description || '';
        }
    }
}

// Notification Service Module
const notificationService = {
    init() {
        this.notificationIcon = document.getElementById('notificationIcon');
        this.notificationDropdown = document.getElementById('notificationDropdown');
        this.notificationCount = document.getElementById('notificationCount');
        this.notificationList = document.getElementById('notificationList');
        this.markAllReadButton = document.getElementById('markAllRead');

        this.setupEventListeners();
        this.renderNotifications();
    },

    setupEventListeners() {
        this.notificationIcon.addEventListener('click', (e) => this.toggleDropdown(e));
        document.addEventListener('click', (e) => this.closeDropdown(e));
        this.markAllReadButton.addEventListener('click', () => this.markAllRead());
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

    renderNotifications() {
        const notifications = [
            { message: "New project request from Client A", read: false },
            { message: "Your service was featured", read: false },
            { message: "Payment received for Logo Design", read: false }
        ];

        this.notificationList.innerHTML = notifications.map(notification => `
            <div class="notification-item ${notification.read ? '' : 'unread'}">
                <p>${notification.message}</p>
            </div>
        `).join('');

        const unreadCount = notifications.filter(n => !n.read).length;
        this.updateNotificationCount(unreadCount);
    },

    updateNotificationCount(count) {
        this.notificationCount.textContent = count;
        this.notificationCount.style.display = count === 0 ? 'none' : 'inline-block';
    },

    markAllRead() {
        const items = document.querySelectorAll('.notification-item');
        items.forEach(item => item.classList.remove('unread'));
        this.updateNotificationCount(0);
        this.notificationDropdown.classList.remove('active');
    }
};

// Profile Service Module
const profileService = {
    init() {
        document.getElementById('edit-profile-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateProfile();
            window.location.href = '../freelancer.html';
        });
        
        // Load saved profile picture if exists
        const savedPicture = localStorage.getItem('profilePicture');
        if (savedPicture && document.getElementById('profile-picture-preview')) {
            document.getElementById('profile-picture-preview').src = savedPicture;
        }
    },

    updateProfile() {
        const location = document.getElementById('profile-location').value;
        const profession = document.getElementById('profile-profession').value;
        const description = document.getElementById('profile-description').value;

        // Update local storage
        const freelancerData = {
            address: location,
            profession: profession,
            description: description
        };
        localStorage.setItem('freelancerData', JSON.stringify(freelancerData));

        // Handle profile picture upload
        const fileInput = document.getElementById('profile-picture');
        if (fileInput.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                localStorage.setItem('profilePicture', e.target.result);
            };
            reader.readAsDataURL(fileInput.files[0]);
        }
    }
};

// Service Management Module
const serviceManager = {
    services: [
        { name: 'Logo Design', price: 150, buyers: 85, availability: 'active' },
        { name: 'Web Design', price: 500, buyers: 45, availability: 'deactive' },
        { name: 'Social Media Design', price: 100, buyers: 30, availability: 'active' }
    ],

    init() {
        // Initialize post service form if exists
        if (document.getElementById('post-service-form')) {
            document.getElementById('post-service-form').addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleNewService();
                window.location.href = '../freelancer.html';
            });
        }

        // Initialize manage services if exists
        if (document.getElementById('manage-services-container')) {
            this.renderAllServices();
            this.setupEventDelegation();
        }
    },

    renderAllServices() {
        this.renderServicesList();
        this.renderManageServices();
    },

    renderServicesList() {
        const container = document.getElementById('services-list');
        if (container) {
            container.innerHTML = this.services.map(service => `
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
        }
    },

    renderManageServices() {
        const container = document.getElementById('manage-services-container');
        if (container) {
            container.innerHTML = this.services.map((service, index) => `
                <div class="service-item">
                    <div class="service-inputs">
                        <label for="service-name-${index}">Service Name:</label>
                        <input type="text" id="service-name-${index}" value="${service.name}" data-index="${index}">
                        <label for="service-price-${index}">Price ($):</label>
                        <input type="number" id="service-price-${index}" value="${service.price}" data-index="${index}">
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
        }
    },

    setupEventDelegation() {
        const container = document.getElementById('manage-services-container');
        if (container) {
            container.addEventListener('click', (e) => {
                const index = e.target.dataset.index;
                if (e.target.classList.contains('toggle-button')) this.toggleAvailability(index);
                if (e.target.classList.contains('btn-save')) this.saveServiceChanges(index);
                if (e.target.classList.contains('btn-drop')) this.dropService(index);
            });
        }
    },

    handleNewService() {
        const newService = {
            name: document.getElementById('service-name').value,
            price: parseFloat(document.getElementById('service-price').value),
            buyers: 0,
            availability: document.getElementById('service-availability').value
        };
        this.services.push(newService);
        localStorage.setItem('freelancerServices', JSON.stringify(this.services));
    },

    toggleAvailability(index) {
        this.services[index].availability = 
            this.services[index].availability === 'active' ? 'deactive' : 'active';
        this.renderAllServices();
    },

    saveServiceChanges(index) {
        const nameInput = document.querySelector(`#service-name-${index}`);
        const priceInput = document.querySelector(`#service-price-${index}`);
        this.services[index].name = nameInput.value;
        this.services[index].price = parseFloat(priceInput.value);
        localStorage.setItem('freelancerServices', JSON.stringify(this.services));
        alert('Service updated successfully!');
    },

    dropService(index) {
        if (confirm('Are you sure you want to drop this service?')) {
            this.services.splice(index, 1);
            localStorage.setItem('freelancerServices', JSON.stringify(this.services));
            this.renderAllServices();
            alert('Service dropped successfully!');
        }
    }
};

// Order Service Module
const orderService = {
    orders: [
        { customer: 'John Doe', service: 'Logo Design' },
        { customer: 'Jane Smith', service: 'Web Design' },
        { customer: 'Ahmed Ali', service: 'Social Media Design' }
    ],

    init() {
        this.renderOrders();
        this.setupEventDelegation();
    },

    renderOrders() {
        const container = document.getElementById('order-list-container');
        if (container) {
            container.innerHTML = this.orders.map((order, index) => `
                <div class="order-item">
                    <span>Customer: ${order.customer}</span>
                    <span>Service: ${order.service}</span>
                    <div class="order-actions">
                        <button class="btn btn-accept" data-index="${index}">Accept</button>
                        <button class="btn btn-reject" data-index="${index}">Reject</button>
                    </div>
                </div>
            `).join('');
        }
    },

    setupEventDelegation() {
        const container = document.getElementById('order-list-container');
        if (container) {
            container.addEventListener('click', (e) => {
                const index = e.target.dataset.index;
                if (e.target.classList.contains('btn-accept')) this.acceptOrder(index);
                if (e.target.classList.contains('btn-reject')) this.rejectOrder(index);
            });
        }
    },

    acceptOrder(index) {
        alert(`Accepted order from ${this.orders[index].customer}`);
        this.orders.splice(index, 1);
        this.renderOrders();
    },

    rejectOrder(index) {
        alert(`Rejected order from ${this.orders[index].customer}`);
        this.orders.splice(index, 1);
        this.renderOrders();
    }
};

// WhatsApp function
function openWhatsApp() {
    const phoneNumber = document.getElementById('phoneNumber').textContent.replace(/\D/g, '');
    window.open(`https://wa.me/${phoneNumber}`, '_blank');
}

// Preview profile picture
function previewProfilePicture(event) {
    const reader = new FileReader();
    reader.onload = function() {
        const preview = document.getElementById('profile-picture-preview');
        preview.src = reader.result;
    };
    reader.readAsDataURL(event.target.files[0]);
}