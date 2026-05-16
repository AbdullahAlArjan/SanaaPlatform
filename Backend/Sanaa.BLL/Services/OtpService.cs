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
            Console.WriteLine($"[OtpService] ── SendOtpAsync START | email={email} | purpose={purpose}");

            // ── 1. Resolve user ──────────────────────────────────────────────────
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null)
            {
                Console.WriteLine($"[OtpService] ❌ STEP 1 FAILED — user not found: {email}");
                return false;
            }
            Console.WriteLine($"[OtpService] ✅ STEP 1 — user resolved: ID={user.UserID}");

            // ── 2. Cancel previous unused codes for the same purpose ─────────────
            var existing = await _context.OtpCodes
                .Where(o => o.UserId == user.UserID && o.Purpose == purpose && !o.IsUsed)
                .ToListAsync();
            existing.ForEach(o => o.IsUsed = true);
            Console.WriteLine($"[OtpService]    Invalidated {existing.Count} existing OTP(s)");

            // ── 3. Generate and track new OTP ────────────────────────────────────
            var code = GenerateCode();
            _context.OtpCodes.Add(new OtpCode
            {
                UserId    = user.UserID,
                Code      = code,
                Purpose   = purpose,
                ExpiresAt = DateTime.UtcNow.AddMinutes(10),
                IsUsed    = false,
                CreatedAt = DateTime.UtcNow,
            });

            // ── 4. SAVE TO DB — isolated try/catch; failure returns false ────────
            try
            {
                await _context.SaveChangesAsync();
                Console.WriteLine($"[OtpService] ✅ STEP 4 — OTP saved to DB | UserID={user.UserID} | Purpose={purpose} | Code={code}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[OtpService] ❌ STEP 4 FAILED — DB save threw an exception:");
                Console.WriteLine($"[OtpService]    Type    : {ex.GetType().Name}");
                Console.WriteLine($"[OtpService]    Message : {ex.Message}");
                if (ex.InnerException != null)
                    Console.WriteLine($"[OtpService]    Inner   : {ex.InnerException.Message}");
                return false;   // OTP not in DB — nothing to email, abort cleanly
            }

            // ── 5. SEND EMAIL — fire-and-forget so the HTTP request returns instantly ──
            // The OTP is already in the DB; email delivery happens on a background thread.
            var emailSnapshot = email;
            var codeSnapshot  = code;
            var purposeSnap   = purpose;
            _ = Task.Run(async () =>
            {
                try
                {
                    await SendEmailAsync(emailSnapshot, codeSnapshot, purposeSnap);
                    Console.WriteLine($"[OtpService] ✅ STEP 5 — background email delivered to {emailSnapshot}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[OtpService] ⚠️  STEP 5 — background email failed (OTP IS in DB, code={codeSnapshot}):");
                    Console.WriteLine($"[OtpService]    Type    : {ex.GetType().Name}");
                    Console.WriteLine($"[OtpService]    Message : {ex.Message}");
                    if (ex.InnerException != null)
                        Console.WriteLine($"[OtpService]    Inner   : {ex.InnerException.Message}");
                }
            });

            Console.WriteLine($"[OtpService] ── SendOtpAsync END — returning true");
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
                // Log the SMTP error in detail, then let it propagate to SendOtpAsync's
                // step-5 catch block, which handles it without undoing the DB save.
                Console.WriteLine($"[EmailService] ❌ SMTP error sending to {toEmail}:");
                Console.WriteLine($"[EmailService]    Type    : {ex.GetType().Name}");
                Console.WriteLine($"[EmailService]    Message : {ex.Message}");
                if (ex.InnerException != null)
                    Console.WriteLine($"[EmailService]    Inner   : {ex.InnerException.Message}");
                throw;
            }
        }
    }
}
