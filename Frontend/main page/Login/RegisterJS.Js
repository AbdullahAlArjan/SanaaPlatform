// JavaScript to toggle password visibility
const togglePassword = document.getElementById('togglePassword');
const password = document.getElementById('password');

if (togglePassword && password) {
    togglePassword.addEventListener('click', function () {
        const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
        password.setAttribute('type', type);
        this.querySelector('i').classList.toggle('fa-eye-slash');
    });
}

// Password and Confirm Password Validation
const registerForm = document.getElementById('registerForm');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm-password');
const passwordError = document.getElementById('passwordError');
const phoneInput = document.getElementById('phone');
const phoneError = document.getElementById('phoneError');
const successScreen = document.getElementById('successScreen');

if (registerForm) {
    registerForm.addEventListener('submit', function (e) {
        e.preventDefault(); // Prevent actual form submission

        let isValid = true;

        // Validate phone number
        if (!/^\d{10}$/.test(phoneInput.value)) {
            phoneError.style.display = 'block';
            isValid = false;
        } else {
            phoneError.style.display = 'none';
        }

        // Validate password match
        if (passwordInput.value !== confirmPasswordInput.value) {
            passwordError.style.display = 'block';
            isValid = false;
        } else {
            passwordError.style.display = 'none';
        }

        if (isValid) {
            // Get form values
            const firstName = document.getElementById('firstname').value.trim();
            const lastName = document.getElementById('lastname').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const birthday = document.getElementById('birthday').value;
            const age = calculateAge(birthday); // Calculate age from birthday

            // Save data to localStorage
            localStorage.setItem('fullName', `${firstName} ${lastName}`);
            localStorage.setItem('phoneNumber', phone);
            localStorage.setItem('age', age);
            localStorage.setItem('birthday', birthday);

            // Hide the form and show the success screen
            document.querySelector('.register-section').style.display = 'none';
            successScreen.style.display = 'flex';
        }
    });
}

// Calculate age from birthday
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

// Success Screen Button Actions
function registerAsFreelancer() {
    // Redirect to FreelancerReg.html
    window.location.href = 'FreelancerReg.html';
}

function continueAsCustomer() {
    // Redirect to customer.html (use relative path)
    window.location.href = 'Customer/customer.html';
}