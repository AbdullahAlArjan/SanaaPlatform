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

if (registerForm) {
    registerForm.addEventListener('submit', function (e) {
        e.preventDefault(); 

        let isValid = true;

        // Validate phone number (10 digits)
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
            const email = document.getElementById('email').value.trim(); 
            const phone = document.getElementById('phone').value.trim();
            const birthday = document.getElementById('birthday').value;
            const age = calculateAge(birthday);

            // Save data to localStorage
            localStorage.setItem('fullName', `${firstName} ${lastName}`);
            localStorage.setItem('phoneNumber', phone);
            localStorage.setItem('age', age);
            localStorage.setItem('birthday', birthday);

            // التعديل: التوجيه لصفحة الـ OTP مع تمرير الإيميل عبر الرابط
            const otpUrl = `otp-verify.html?email=${encodeURIComponent(email)}&purpose=Registration`;
            window.location.href = otpUrl;
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