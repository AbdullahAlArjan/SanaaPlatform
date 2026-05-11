// استيراد دوال الاتصال والحماية
import { apiFetch } from './api.js';
import { requireAuth } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. حماية الصفحة: تأكد إن اللي داخل هو "Freelancer"
    // إذا مش مسجل دخول، رح يرجعه تلقائياً لصفحة الـ Login
    const user = requireAuth(['freelancer']); 
    if (!user) return;

    // 2. تعبئة البيانات الحقيقية
    await initializeProfileData(user);
    
    // باقي تهيئة الصفحة (خليناها زي ما هي عشان ما يخرب تصميمك)
    if (document.getElementById('notificationIcon')) {
        notificationService.init();
    }
    if (document.getElementById('edit-profile-form')) {
        profileService.init();
    }
    if (document.getElementById('manage-services-container')) {
        serviceManager.init();
        orderService.init();
    }
    if (document.getElementById('post-service-form')) {
        serviceManager.init();
    }
});

// دالة جلب البيانات من الباك إند (بدل الـ LocalStorage القديم)
async function initializeProfileData(user) {
    try {
        // نضع المعلومات الأساسية من التوكن (الاسم) كحالة افتراضية
        if (document.getElementById('fullName')) {
            document.getElementById('fullName').textContent = user.fullName;
        }

        // نجلب باقي التفاصيل من الباك إند (تأكد من الرابط في السواغر)
        // قد يكون /api/freelancers/profile أو /api/users/profile
        const profile = await apiFetch('/api/users/profile').catch(() => null);

        if (profile) {
            // تحديث العناصر إذا كانت موجودة بالـ HTML
            if (document.getElementById('phoneNumber')) {
                document.getElementById('phoneNumber').textContent = profile.phoneNumber || 'No phone provided';
            }
            if (document.getElementById('profession')) {
                document.getElementById('profession').textContent = profile.profession || 'Freelancer';
            }
            if (document.getElementById('address')) {
                document.getElementById('address').textContent = profile.location || 'Jordan';
            }
            if (document.getElementById('profile-description')) {
                document.getElementById('profile-description').textContent = profile.bio || 'No bio provided yet.';
            }

            // تعبئة فورم التعديل (Edit Profile) بالبيانات الحالية
            if (document.getElementById('profile-location')) {
                document.getElementById('profile-location').value = profile.location || '';
            }
            if (document.getElementById('profile-profession')) {
                document.getElementById('profile-profession').value = profile.profession || '';
            }
            if (document.getElementById('profile-description')) {
                document.getElementById('profile-description').value = profile.bio || '';
            }
        }
    } catch (error) {
        console.error("Error loading profile data:", error);
    }
}

// ... (باقي الكود تبعك زي notificationService و profileService خليه زي ما هو تحت هذا الجزء) ...

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