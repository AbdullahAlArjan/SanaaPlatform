/**
 * REGISTRATION FORM FUNCTIONALITY
 * Handles form validation, password toggle, and form submission
 */

// Password Visibility Toggle
const togglePassword = document.getElementById('togglePassword');
const password = document.getElementById('password');

if (togglePassword && password) {
    togglePassword.addEventListener('click', function() {
        const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
        password.setAttribute('type', type);
        this.querySelector('i').classList.toggle('fa-eye-slash');
    });
}

// Form Validation and Submission
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', handleFormSubmission);
}

function handleFormSubmission(e) {
    e.preventDefault();
    
    // Form Elements
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const passwordError = document.getElementById('passwordError');
    const phoneInput = document.getElementById('phone');
    const phoneError = document.getElementById('phoneError');

    // Validation Flags
    let isValid = true;

    // Phone Validation
    if (!/^\d{10}$/.test(phoneInput.value)) {
        phoneError.style.display = 'block';
        isValid = false;
    } else {
        phoneError.style.display = 'none';
    }

    // Password Match Validation
    if (passwordInput.value !== confirmPasswordInput.value) {
        passwordError.style.display = 'block';
        isValid = false;
    } else {
        passwordError.style.display = 'none';
    }

    // If valid, process registration
    if (isValid) {
        processRegistration();
    }
}

function processRegistration() {
    // Get form values
    const firstName = document.getElementById('firstname').value.trim();
    const lastName = document.getElementById('lastname').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const birthday = document.getElementById('birthday').value;
    const age = calculateAge(birthday);

    // Save to localStorage
    localStorage.setItem('fullName', `${firstName} ${lastName}`);
    localStorage.setItem('phoneNumber', phone);
    localStorage.setItem('age', age);
    localStorage.setItem('birthday', birthday);

    // Redirect to success page
    window.location.href = '../../main page/Login/choosepage.html';
}

function calculateAge(birthday) {
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}