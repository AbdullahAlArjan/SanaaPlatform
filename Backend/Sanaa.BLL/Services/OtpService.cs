using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using MimeKit;
using Sanaa.BLL.Interfaces;
using Sanaa.DAL;
using Sanaa.DAL.Entities;

namespace Sanaa.BLL.Services
{
    public class OtpService : IOtpService
    {
        private readonly SanaaDbContext _context;
        private readonly IConfiguration _configuration;

        public OtpService(SanaaDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        private string GenerateCode() =>
            System.Security.Cryptography.RandomNumberGenerator.GetInt32(100000, 1000000).ToString();

        public async Task<bool> SendOtpAsync(string email, OtpPurpose purpose)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null) return false;

            // إلغاء الرموز السابقة غير المستخدمة لنفس الغرض
            var existing = await _context.OtpCodes
                .Where(o => o.UserId == user.UserID && o.Purpose == purpose && !o.IsUsed)
                .ToListAsync();
            existing.ForEach(o => o.IsUsed = true);

            var code = GenerateCode();
            _context.OtpCodes.Add(new OtpCode
            {
                UserId = user.UserID,
                Code = code,
                Purpose = purpose,
                ExpiresAt = DateTime.UtcNow.AddMinutes(10),
                IsUsed = false,
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            await SendEmailAsync(email, code, purpose);
            return true;
        }

        public async Task<bool> VerifyOtpAsync(string email, string code, OtpPurpose purpose)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null) return false;

            var otp = await _context.OtpCodes
                .Where(o => o.UserId == user.UserID
                         && o.Code == code
                         && o.Purpose == purpose
                         && !o.IsUsed
                         && o.ExpiresAt > DateTime.UtcNow)
                .FirstOrDefaultAsync();

            if (otp == null) return false;

            otp.IsUsed = true;

            if (purpose == OtpPurpose.EmailVerification)
                user.IsEmailVerified = true;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ResetPasswordAsync(string email, string code, string newPassword)
        {
            var verified = await VerifyOtpAsync(email, code, OtpPurpose.PasswordReset);
            if (!verified) return false;

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null) return false;

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
            await _context.SaveChangesAsync();
            return true;
        }

        private async Task SendEmailAsync(string toEmail, string code, OtpPurpose purpose)
        {
            var subject = purpose == OtpPurpose.EmailVerification
                ? "رمز التحقق من بريدك الإلكتروني - منصة صنعاء"
                : "رمز إعادة تعيين كلمة المرور - منصة صنعاء";

            var body = purpose == OtpPurpose.EmailVerification
                ? $"<div dir='rtl'><h3>مرحباً بك في منصة صنعاء</h3><p>رمز التحقق الخاص بك: <strong style='font-size:24px;letter-spacing:4px;color:#1877f2'>{code}</strong></p><p>صالح لمدة 10 دقائق فقط.</p></div>"
                : $"<div dir='rtl'><h3>منصة صنعاء - إعادة تعيين كلمة المرور</h3><p>رمز إعادة التعيين: <strong style='font-size:24px;letter-spacing:4px;color:#e74c3c'>{code}</strong></p><p>صالح لمدة 10 دقائق فقط.</p></div>";

            // ── تشخيص الإعدادات قبل الإرسال ─────────────────────────────────
            var host     = _configuration["Smtp:Host"];
            var port     = _configuration["Smtp:Port"];
            var username = _configuration["Smtp:Username"];
            var sender   = _configuration["Smtp:SenderEmail"];

            Console.WriteLine($"[EmailService] إرسال OTP إلى: {toEmail}");
            Console.WriteLine($"[EmailService] SMTP Host: {host}:{port}  |  From: {sender}  |  Username: {username}");

            if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(username) ||
                username == "your-email@gmail.com")
            {
                Console.WriteLine("[EmailService] ⚠️  إعدادات SMTP غير مكتملة في appsettings.json — تم تخطي الإرسال");
                return;
            }

            try
            {
                var message = new MimeMessage();
                message.From.Add(new MailboxAddress(
                    _configuration["Smtp:SenderName"],
                    sender));
                message.To.Add(MailboxAddress.Parse(toEmail));
                message.Subject = subject;
                message.Body = new TextPart("html") { Text = body };

                using var client = new SmtpClient();
                await client.ConnectAsync(host, int.Parse(port!), SecureSocketOptions.StartTls);
                await client.AuthenticateAsync(username, _configuration["Smtp:Password"]);
                await client.SendAsync(message);
                await client.DisconnectAsync(true);

                Console.WriteLine($"[EmailService] ✅ تم إرسال OTP بنجاح إلى: {toEmail}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[EmailService] ❌ خطأ SMTP عند الإرسال إلى {toEmail}:");
                Console.WriteLine($"[EmailService]    النوع: {ex.GetType().Name}");
                Console.WriteLine($"[EmailService]    الرسالة: {ex.Message}");
                if (ex.InnerException != null)
                    Console.WriteLine($"[EmailService]    Inner: {ex.InnerException.Message}");
                throw; // نرمي الخطأ لأعلى عشان SendOtpAsync يعرف فشل الإيميل
            }
        }
    }
}
