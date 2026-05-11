using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Sanaa.BLL.DTOs;
using Sanaa.BLL.Interfaces;
using Sanaa.DAL.Entities;
using Sanaa.API.DTOs;

namespace Sanaa.API.Controllers
{
    [Route("api/auth")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IOtpService _otpService;
        private readonly IUserService _userService;

        public AuthController(IOtpService otpService, IUserService userService)
        {
            _otpService = otpService;
            _userService = userService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            var role = request.Role?.Trim();
            if (string.IsNullOrEmpty(role) || (role != "Client" && role != "Freelancer"))
                role = "Client";

            var user = new User
            {
                FullName = request.FullName,
                Email = request.Email,
                PasswordHash = request.Password,
                Phone = request.Phone,
                Role = role
            };

            try
            {
                var result = await _userService.CreateUserAsync(user);
                if (result) return Ok(new { message = "تمت إضافة المستخدم بنجاح" });
                return BadRequest(new { message = "فشلت عملية الإضافة", code = "SAVE_FAILED" });
            }
            catch (InvalidOperationException ex)
            {
                // Duplicate email
                return Conflict(new { message = ex.Message, code = "EMAIL_TAKEN" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Register] Unexpected error: {ex}");
                return StatusCode(500, new { message = "خطأ داخلي في الخادم", code = "SERVER_ERROR" });
            }
        }

        [EnableRateLimiting("LoginPolicy")]
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var response = await _userService.LoginAsync(request.Email, request.Password);

            return response?.AccessToken switch
            {
                "USER_NOT_FOUND"     => Unauthorized(new { message = "البريد الإلكتروني غير مسجل", code = "USER_NOT_FOUND" }),
                "WRONG_PASSWORD"     => Unauthorized(new { message = "كلمة المرور غير صحيحة", code = "WRONG_PASSWORD" }),
                "EMAIL_NOT_VERIFIED" => StatusCode(403, new { message = "يرجى التحقق من بريدك الإلكتروني أولاً. أرسل رمز التحقق عبر POST /api/auth/send-otp", code = "EMAIL_NOT_VERIFIED" }),
                _                    => Ok(response)
            };
        }

        [EnableRateLimiting("OtpPolicy")]
        [HttpPost("send-otp")]
        public async Task<IActionResult> SendOtp([FromBody] SendOtpRequest request)
        {
            if (!Enum.TryParse<OtpPurpose>(request.Purpose, out var purpose))
                return BadRequest("نوع الـ OTP غير صحيح. استخدم: EmailVerification أو PasswordReset");

            var result = await _otpService.SendOtpAsync(request.Email, purpose);
            if (!result) return NotFound("البريد الإلكتروني غير موجود");

            return Ok("تم إرسال رمز التحقق إلى بريدك الإلكتروني");
        }

        [HttpPost("verify-otp")]
        public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequest request)
        {
            if (!Enum.TryParse<OtpPurpose>(request.Purpose, out var purpose))
                return BadRequest("نوع الـ OTP غير صحيح");

            var result = await _otpService.VerifyOtpAsync(request.Email, request.Code, purpose);
            if (!result) return BadRequest("الرمز غير صحيح أو منتهي الصلاحية");

            return Ok("تم التحقق بنجاح");
        }

        [EnableRateLimiting("OtpPolicy")]
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            // نرسل دائماً 200 لمنع كشف وجود الإيميل (user enumeration attack)
            await _otpService.SendOtpAsync(request.Email, OtpPurpose.PasswordReset);
            return Ok("إذا كان البريد مسجلاً، سيصلك رمز إعادة التعيين");
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            var result = await _otpService.ResetPasswordAsync(
                request.Email, request.Code, request.NewPassword);

            if (!result) return BadRequest("الرمز غير صحيح أو منتهي الصلاحية");

            return Ok("تم تغيير كلمة المرور بنجاح");
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
        {
            var response = await _userService.RefreshTokenAsync(request.RefreshToken);
            if (response == null)
                return Unauthorized("الـ Refresh Token غير صحيح أو منتهي الصلاحية");

            return Ok(response);
        }

        [Authorize]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout([FromBody] RefreshTokenRequest request)
        {
            await _userService.RevokeTokenAsync(request.RefreshToken);
            return Ok("تم تسجيل الخروج بنجاح");
        }
    }
}
