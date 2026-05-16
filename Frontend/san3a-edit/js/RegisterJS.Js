const API_BASE_URL = 'https://localhost:7101'; // single source for base URL in this file

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

// Password and Confirm Password Validation & Form Submission
const registerForm = document.getElementById('registerForm');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm-password');
const passwordError = document.getElementById('passwordError');
const phoneInput = document.getElementById('phone');
const phoneError = document.getElementById('phoneError');

if (registerForm) {
    // ⚠️ مهم: أضفنا كلمة async هنا لانتظار رد السيرفر
    registerForm.addEventListener('submit', async function (e) {
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
            // 1. جلب القيم من الفورم
            const firstName = document.getElementById('firstname').value.trim();
            const lastName = document.getElementById('lastname').value.trim();
            const email = document.getElementById('email').value.trim(); 
            const phone = phoneInput.value.trim();
            const password = passwordInput.value;
            const birthday = document.getElementById('birthday').value;
            const age = calculateAge(birthday);

            // 2. تخزين بعض البيانات في المتصفح (مفيدة لواجهة المستخدم لاحقاً)
            localStorage.setItem('fullName', `${firstName} ${lastName}`);
            localStorage.setItem('phoneNumber', phone);
            localStorage.setItem('age', age);
            localStorage.setItem('birthday', birthday);

            // 3. تجهيز الـ Payload للباك إند (دمجنا الاسم الأول والأخير لأنه الباك إند غالباً بطلب FullName)
            const requestData = {
    fullName: `${firstName} ${lastName}`,
    email: email,
    password: password,
    phone: phone, // ✅ تم التعديل لتطابق السواغر
    role: "Client" 
};

            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerText;
            
            // حالة التحميل (عشان اليوزر ما يكبس مرتين)
            submitBtn.disabled = true;
            submitBtn.innerText = "Registering...";

            try {
                // 4. إرسال الطلب الفعلي للسيرفر
              const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestData)
                });

                if (response.ok) {
                    // 5. في حال نجاح التسجيل، التوجيه لصفحة الـ OTP مع الإيميل
                    const otpUrl = `otp-verify.html?email=${encodeURIComponent(email)}&purpose=Registration`;
                    window.location.href = otpUrl;
                } else {
                    // في حال الرفض (إيميل مكرر أو خطأ بالبيانات)
                    const errorData = await response.json().catch(() => ({}));
                    alert('Registration Failed: ' + (errorData.message || 'Email may already be in use or data is invalid.'));
                }
            } catch (error) {
                console.error("Fetch Error:", error);
                alert("Could not connect to the server. Is the backend running?");
            } finally {
                // إرجاع الزر لحالته الطبيعية
                submitBtn.disabled = false;
                submitBtn.innerText = originalBtnText;
            }
        }
    });
}

// Calculate age from birthday
function calculateAge(birthday) {
    if (!birthday) return 0;
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}