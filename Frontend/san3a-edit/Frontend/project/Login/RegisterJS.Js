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
        e.preventDefault(); // Prevent actual form submission for demonstration

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
            const gender = document.getElementById('gender').value;
            const birthday = document.getElementById('birthday').value;
            const phone = document.getElementById('phone').value.trim();
            const city = document.getElementById('city').value;

            // Save data to localStorage
            localStorage.setItem('firstName', firstName);
            localStorage.setItem('lastName', lastName);
            localStorage.setItem('gender', gender);
            localStorage.setItem('birthday', birthday);
            localStorage.setItem('phone', phone);
            localStorage.setItem('city', city);

            // Hide the form and show the success screen
            document.querySelector('.register-section').style.display = 'none';
            successScreen.style.display = 'flex';
        }
    });
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

// Form Submission Handling for Freelancer Registration
const freelancerForm = document.getElementById('freelancerForm');

if (freelancerForm) {
    freelancerForm.addEventListener('submit', function (e) {
        e.preventDefault(); // Prevent actual form submission for demonstration

        // Get form values
        const profession = document.getElementById('profession').value;
        const address = document.getElementById('address').value;
        const cvInput = document.getElementById('cv');
        const workSamplesInput = document.getElementById('workSamples');
        const age = document.getElementById('age').value;

        // Save form data to localStorage
        const freelancerData = {
            profession,
            address,
            cv: cvInput.files[0] ? cvInput.files[0].name : 'No CV uploaded',
            workSamples: workSamplesInput.files[0] ? workSamplesInput.files[0].name : 'No work samples uploaded',
            age
        };
        localStorage.setItem('freelancerData', JSON.stringify(freelancerData));

        // Show success message
        alert('Freelancer registration submitted successfully!');

        // Redirect to freelancer.html after submission
        window.location.href = 'freelancer.html';
    });
}