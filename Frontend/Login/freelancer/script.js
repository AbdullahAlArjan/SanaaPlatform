document.addEventListener('DOMContentLoaded', () => {
    // Retrieve data from local storage
    const fullName = localStorage.getItem('fullName');
    const phoneNumber = localStorage.getItem('phoneNumber');
    const age = localStorage.getItem('age');
    const freelancerData = JSON.parse(localStorage.getItem('freelancerData'));

    // Populate profile data
    if (fullName) document.getElementById('fullName').textContent = fullName;
    if (phoneNumber) document.getElementById('phoneNumber').textContent = phoneNumber;
    if (age) document.getElementById('age').textContent = age;

    // Populate freelancer-specific data
    if (freelancerData) {
        const professionElement = document.getElementById('profession');
        const addressElement = document.getElementById('address');
        const descriptionElement = document.getElementById('profile-description');

        if (professionElement) professionElement.textContent = freelancerData.profession;
        if (addressElement) addressElement.textContent = freelancerData.address;
        if (descriptionElement) descriptionElement.textContent = freelancerData.description;
        
        // Pre-fill the description in the edit modal
        const descriptionTextarea = document.getElementById('description-text');
        if (descriptionTextarea) {
            descriptionTextarea.value = freelancerData.description || '';
        }
    }

    // Application State
    let appState = {
        services: [
            { name: 'Logo Design', price: 150, buyers: 85, availability: 'active' },
            { name: 'Web Design', price: 500, buyers: 45, availability: 'deactive' },
            { name: 'Social Media Design', price: 100, buyers: 30, availability: 'active' }
        ],
        orders: [
            { customer: 'John Doe', service: 'Logo Design' },
            { customer: 'Jane Smith', service: 'Web Design' },
            { customer: 'Ahmed Ali', service: 'Social Media Design' }
        ],
        testimonials: [
            {
                rating: 4.5,
                review: "Abd delivered exceptional work! The designs were modern and exactly what we needed for our rebranding.",
                client: "John Doe, CEO at DesignCo"
            },
            {
                rating: 5,
                review: "Amazing designs and quick delivery! Abd is a true professional who understands the client's vision.",
                client: "Jane Smith, Marketing Manager"
            },
            {
                rating: 5,
                review: "The logo Abd designed for us was beyond our expectations. Highly recommend his services!",
                client: "Ahmed Ali, Founder of TechStart"
            },
            {
                rating: 5,
                review: "Abd's attention to detail is unmatched. He transformed our website into a modern masterpiece.",
                client: "Sarah Johnson, Creative Director"
            },
            {
                rating: 5,
                review: "Working with Abd was a pleasure. He is responsive, creative, and delivers on time.",
                client: "Michael Brown, Product Manager"
            }
        ],
        notifications: [
            { message: "New project request from Client A", read: false },
            { message: "Your service was featured", read: false },
            { message: "Payment received for Logo Design", read: false }
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
            this.notificationList.innerHTML = appState.notifications.map((notification, index) => `
                <div class="notification-item ${notification.read ? '' : 'unread'}">
                    <p>${notification.message}</p>
                </div>
            `).join('');

            const unreadCount = appState.notifications.filter(n => !n.read).length;
            this.updateNotificationCount(unreadCount);
        },

        updateNotificationCount(count) {
            this.notificationCount.textContent = count;
            if (count === 0) {
                this.notificationCount.style.display = 'none';
            } else {
                this.notificationCount.style.display = 'inline-block';
            }
        },

        markAllRead() {
            appState.notifications.forEach(notification => notification.read = true);
            this.renderNotifications();
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
            
            // Update the description in local storage
            const freelancerData = JSON.parse(localStorage.getItem('freelancerData')) || {};
            freelancerData.description = newDescription;
            localStorage.setItem('freelancerData', JSON.stringify(freelancerData));
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

    // Initialize All Modules
    modalService.init();
    notificationService.init();
    profileService.init();
    orderService.init();
    serviceManager.init();
});