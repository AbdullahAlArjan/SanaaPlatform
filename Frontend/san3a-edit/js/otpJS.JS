// 1. تعريف رابط السيرفر (سيقوم الباك إيند بتعديله حسب إعداداتهم)
const API_BASE_URL = 'https://localhost:7101'; 

document.addEventListener('DOMContentLoaded', () => {
    // 2. جلب البيانات من الرابط (Email & Purpose)
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email') || '';
    const purpose = params.get('purpose') || 'Registration';

    const emailDisplay = document.getElementById('emailDisplay');
    if (emailDisplay) emailDisplay.textContent = email;

    // 3. مراجع العناصر (DOM)
    const otpCard = document.getElementById('otpCard');
    const successScreen = document.getElementById('successScreen');
    const verifyBtn = document.getElementById('verifyBtn');
    const boxes = Array.from(document.querySelectorAll('.otp-box'));
    const btnText = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');

    // التأكد من إخفاء شاشة النجاح برمجياً في البداية
    if (successScreen) successScreen.style.display = 'none';

    // 4. منطق مربعات الـ OTP (التنقل التلقائي)
    boxes.forEach((box, i) => {
        box.addEventListener('input', (e) => {
            const val = e.target.value.replace(/\D/g, ''); // أرقام فقط
            box.value = val ? val[0] : '';
            if (val && i < boxes.length - 1) boxes[i + 1].focus();
            
            const isComplete = boxes.every(b => b.value.length === 1);
            verifyBtn.disabled = !isComplete;
        });

        box.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !box.value && i > 0) boxes[i - 1].focus();
        });
    });

    // 5. عملية التحقق الحقيقية (Integration with Backend)
    verifyBtn.addEventListener('click', async () => {
        const code = boxes.map(b => b.value).join('');
        
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code, purpose }),
            });

            if (res.ok) {
                // في حالة النجاح: التبديل بين واجهة الـ OTP وشاشة النجاح
                if (purpose === 'Registration') {
                    if (otpCard) otpCard.style.display = 'none';
                    if (successScreen) {
                        successScreen.style.display = 'flex';
                        successScreen.style.flexDirection = 'column';
                        successScreen.style.alignItems = 'center';
                    }
                } else {
                    // في حالة تغيير كلمة المرور مثلاً، التوجيه لتسجيل الدخول
                    window.location.href = 'login.html';
                }
            } else {
                const errorData = await res.json().catch(() => ({}));
                alert(errorData.message || 'Verification failed. Please check the code.');
                _resetBoxes();
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            alert('Could not connect to the server. Please ensure the backend is running.');
        } finally {
            setLoading(false);
        }
    });

    // دالة مساعدة لتنظيف المربعات عند الخطأ
    function _resetBoxes() {
        boxes.forEach(b => { b.value = ''; });
        boxes[0].focus();
        verifyBtn.disabled = true;
    }

    function setLoading(on) {
        verifyBtn.disabled = on;
        if (btnSpinner) btnSpinner.style.display = on ? 'inline-block' : 'none';
        if (btnText) btnText.textContent = on ? 'Verifying...' : 'Verify Email';
    }
});

// 6. تعريف دوال أزرار شاشة النجاح عالمياً (لتعمل مع onclick في الـ HTML)
window.registerAsFreelancer = function() {
    window.location.href = 'FreelancerReg.html';
};

window.continueAsCustomer = function() {
    window.location.href = 'customer.html';
};