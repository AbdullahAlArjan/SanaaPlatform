document.addEventListener('DOMContentLoaded', function () {
    // Toggle password visibility
    const togglePassword = document.getElementById('togglePassword');
    const password = document.getElementById('password');

    if (togglePassword && password) {
        togglePassword.addEventListener('click', function () {
            const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
            password.setAttribute('type', type);
            this.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }

    // Login form submission
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault(); // Prevent actual form submission

            // Get input values
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // Check if the credentials are for the admin
            if (email === 'admin@gmail.com' && password === 'admin') {
                window.location.href = 'C:/Users/abdba/Desktop/project/main page/Login/Admin/Admin.html';
            } else if (email === 'Freelancer@gmail.com' && password === 'freelancer') {
                window.location.href = 'C:/Users/abdba/Desktop/project/main page/Login/freelancer/freelancer.html';
            } else {
                // Show the error message
                errorMessage.style.display = 'block';
            }
        });

        // Hide the error message when the user starts typing again
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');

        emailInput.addEventListener('input', function () {
            errorMessage.style.display = 'none';
        });

        passwordInput.addEventListener('input', function () {
            errorMessage.style.display = 'none';
        });
    } else {
        console.error('Login form not found!');
    }

    // Forgot Password Modal
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const forgotPasswordModal = document.getElementById('forgotPasswordModal');
    const closeModal = document.querySelector('.close-modal');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const forgotPasswordMessage = document.getElementById('forgotPasswordMessage');

    if (forgotPasswordLink && forgotPasswordModal) {
        // Show modal when "Forgot your password?" is clicked
        forgotPasswordLink.addEventListener('click', function (e) {
            e.preventDefault();
            forgotPasswordModal.style.display = 'flex';
        });

        // Close modal when the close button is clicked
        closeModal.addEventListener('click', function () {
            forgotPasswordModal.style.display = 'none';
        });

        // Close modal when clicking outside the modal
        window.addEventListener('click', function (e) {
            if (e.target === forgotPasswordModal) {
                forgotPasswordModal.style.display = 'none';
            }
        });

        // Handle forgot password form submission
        forgotPasswordForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const email = document.getElementById('forgotEmail').value;

            // Simulate sending a reset link (replace with actual backend logic)
            console.log(`Password reset link sent to: ${email}`);
            forgotPasswordMessage.style.display = 'block';

            // Clear the form and hide the message after a few seconds
            setTimeout(function () {
                forgotPasswordForm.reset();
                forgotPasswordMessage.style.display = 'none';
                forgotPasswordModal.style.display = 'none';
            }, 3000);
        });
    }
});