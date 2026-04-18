document.addEventListener('DOMContentLoaded', () => {
    // Retrieve data from localStorage
    const firstName = localStorage.getItem('firstName');
    const lastName = localStorage.getItem('lastName');
    const gender = localStorage.getItem('gender');
    const birthday = localStorage.getItem('birthday'); // Retrieve birthday
    const phone = localStorage.getItem('phone');
    const city = localStorage.getItem('city');
    const profileImage = localStorage.getItem('profileImage');

    // Display data if all required fields are present
    if (firstName && lastName && gender && birthday && phone && city) {
        document.getElementById('fullName').textContent = `${firstName} ${lastName}`;
        document.getElementById('genderDisplay').textContent = gender;
        document.getElementById('birthdayDisplay').textContent = birthday; // Display birthday
        document.getElementById('phoneDisplay').textContent = phone;
        document.getElementById('cityDisplay').textContent = city;
    } else {
        // Redirect to registration page if data is missing
        window.location.href = 'Register.html';
    }

    // Load profile image if available
    if (profileImage) {
        document.getElementById('profileImage').src = profileImage;
        document.getElementById('profileImage').style.display = 'block';
    }

    // Load notifications and services
    loadNotifications();
    loadFavoriteServices();
    loadPurchasedServices();
});

// Avatar Upload Handling
document.getElementById('avatarUpload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            // Update profile image and save to localStorage
            document.getElementById('profileImage').src = e.target.result;
            document.getElementById('profileImage').style.display = 'block';
            localStorage.setItem('profileImage', e.target.result);
        };
        reader.readAsDataURL(file);
    }
});

// Open Profile Editor Modal
function openProfileEditor() {
    const modal = document.getElementById('profileEditorModal');
    modal.style.display = 'flex';

    // Load current values into the modal inputs
    document.getElementById('genderInput').value = localStorage.getItem('gender') || '';
    document.getElementById('phoneInput').value = localStorage.getItem('phone') || '';
    document.getElementById('cityInput').value = localStorage.getItem('city') || '';
    document.getElementById('birthdayInput').value = localStorage.getItem('birthday') || ''; // Load birthday
}

// Save Profile Changes
function saveProfileChanges() {
    const phoneInput = document.getElementById('phoneInput');
    const phoneError = document.getElementById('phoneError');

    // Validate phone number
    if (!/^\d{10}$/.test(phoneInput.value)) {
        phoneError.style.display = 'block'; // Show error message
        phoneInput.focus(); // Focus on the input field
        return; // Stop further execution
    } else {
        phoneError.style.display = 'none'; // Hide error message
    }

    // Update Birthday
    const newBirthday = document.getElementById('birthdayInput').value;
    if (newBirthday) {
        document.getElementById('birthdayDisplay').textContent = newBirthday;
        localStorage.setItem('birthday', newBirthday);
    }

    // Update Gender
    const newGender = document.getElementById('genderInput').value;
    if (newGender) {
        document.getElementById('genderDisplay').textContent = newGender;
        localStorage.setItem('gender', newGender);
    }

    // Update Phone Number
    const newPhone = phoneInput.value;
    if (newPhone) {
        document.getElementById('phoneDisplay').textContent = newPhone;
        localStorage.setItem('phone', newPhone);
    }

    // Update City
    const newCity = document.getElementById('cityInput').value;
    if (newCity) {
        document.getElementById('cityDisplay').textContent = newCity;
        localStorage.setItem('city', newCity);
    }

    // Show success message
    alert('Profile changes saved successfully!');

    // Close the modal
    closeModal('profileEditorModal');
}

// Close Modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none'; // Hide the modal
    }
}

// Toggle Notifications Dropdown
function toggleNotifications() {
    const dropdown = document.getElementById('notificationsDropdown');
    dropdown.classList.toggle('active');
}

// Notifications Data
const notifications = [
    { icon: "fa-envelope", message: "You have a new message" },
    { icon: "fa-check-circle", message: "Your service request was approved" },
    { icon: "fa-bell", message: "New service available: Graphic Design" }
];

// Load Notifications
function loadNotifications() {
    const notificationsList = document.getElementById('notificationsList');
    notificationsList.innerHTML = notifications.map(notification => `
        <div class="notification">
            <i class="fas ${notification.icon}"></i>
            <span>${notification.message}</span>
        </div>
    `).join('');
}

// Example Data for Services
const favoriteServices = [
    {
        image: "gd.jpeg", // Larger placeholder image
        title: "Graphic Design",
        provider: "Creative Studio",
        price: "$150"
    },
    {
        image: "ld.webp",
        title: "Logo Design",
        provider: "Design Masters",
        price: "$100"
    },
    {
        image: "sm.png",
        title: "Social Media Management",
        provider: "Market Pro",
        price: "$200"
    }
];

const purchasedServices = [
    {
        image: "wd.jpeg",
        title: "Web Development",
        provider: "Tech Solutions",
        price: "$500"
    },
    {
        image: "seo.jpeg",
        title: "SEO Optimization",
        provider: "Digital Boost",
        price: "$300"
    },
    {
        image: "mb.jpeg",
        title: "Mobile App Development",
        provider: "App Creators",
        price: "$800"
    }
];

// Function to create a service card
function createServiceCard(service, type) {
    const card = document.createElement('div');
    card.className = 'service-card';
    card.innerHTML = `
        <div class="service-image">
            <img src="${service.image}" alt="${service.title}">
        </div>
        <div class="service-content">
            <h3>${service.title}</h3>
            <p class="service-provider">By ${service.provider}</p>
            <div class="service-footer">
                <span class="price">${service.price}</span>
                <button class="action-btn">
                    <i class="fas ${type === 'favorite' ? 'fa-heart' : 'fa-shopping-bag'}"></i>
                </button>
            </div>
        </div>
    `;
    return card;
}

// Load Favorite Services
function loadFavoriteServices() {
    const favoriteServicesGrid = document.getElementById('favoriteServices');
    favoriteServicesGrid.innerHTML = favoriteServices.map(service => 
        createServiceCard(service, 'favorite').outerHTML
    ).join('');
}

// Load Purchased Services
function loadPurchasedServices() {
    const purchasedServicesGrid = document.getElementById('purchasedServices');
    purchasedServicesGrid.innerHTML = purchasedServices.map(service => 
        createServiceCard(service, 'purchased').outerHTML
    ).join('');
}