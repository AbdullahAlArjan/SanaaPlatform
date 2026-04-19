using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Sanaa.BLL.DTOs;
using Sanaa.BLL.Interfaces;
using Sanaa.DAL;
using Sanaa.DAL.Entities;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
namespace Sanaa.BLL.Services
{
    // بنخلي الكلاس يورث من الـ Interface عشان نلتزم بالعقد
    public class UserService : IUserService
    {
        private readonly SanaaDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IOtpService _otpService;

        // 1. Dependency Injection: بنطلب نسخة من الداتا بيس عشان نستخدمها
        public UserService(SanaaDbContext context, IConfiguration configuration, IOtpService otpService)
        {
            _context = context;
            _configuration = configuration;
            _otpService = otpService;
        }
        private (string token, DateTime expiry) GenerateJwtToken(User user)
        {
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            // المعلومات اللي بتنحط جوا التذكرة
            var claims = new[]
            {
        new Claim(ClaimTypes.NameIdentifier, user.UserID.ToString()),
        new Claim(ClaimTypes.Email, user.Email),
        new Claim(ClaimTypes.Name, user.FullName),
        new Claim(ClaimTypes.Role, user.Role) // هاد اللي بحدد شو مسموحله يعمل
            };

            var expiry = DateTime.UtcNow.AddMinutes(15);
            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: expiry,
                signingCredentials: credentials);

            return (new JwtSecurityTokenHandler().WriteToken(token), expiry);
        }

        private static string GenerateRefreshToken()
        {
            var bytes = new byte[64];
            RandomNumberGenerator.Fill(bytes);
            return Convert.ToBase64String(bytes);
        }

        // 2. جلب كل المستخدمين (استخدام EF)
        public async Task<IEnumerable<User>> GetAllUsersAsync(UserSearchFilterDto filter)
        {
            // 1. بنجيب اليوزرز وبنشبك معهم جدول البروفايل عشان نقدر نفلتر منه
            var query = _context.Users.Include(u => u.FreelancerProfile).AsQueryable();

            // 2. فلترة الاسم (استخدمنا FullName زي ما هو عندك)
            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                query = query.Where(u => u.FullName.Contains(filter.SearchTerm));
            }

            // 3. فلترة المدينة (بندخل على جدول FreelancerProfile وبنفلتر)
            if (!string.IsNullOrWhiteSpace(filter.City))
            {
                query = query.Where(u => u.FreelancerProfile != null && u.FreelancerProfile.City == filter.City);
            }

            // 4. فلترة المهنة (من جدول FreelancerProfile كمان)
            if (!string.IsNullOrWhiteSpace(filter.Profession))
            {
                query = query.Where(u => u.FreelancerProfile != null && u.FreelancerProfile.Profession == filter.Profession);
            }

            return await query.ToListAsync();
        }

        // 3. جلب مستخدم معين بالـ ID مع تفاصيل شغله (استخدام LINQ + Include)
        public async Task<User> GetUserByIdAsync(int id)
        {
            // هون استخدمنا .Include() عشان الـ EF يعمل Join مع جدول الـ FreelancerProfile
            return await _context.Users
                .Include(u => u.FreelancerProfile)
                .FirstOrDefaultAsync(u => u.UserID == id);
        }

        // 4. إضافة مستخدم جديد (Register)
        public async Task<bool> CreateUserAsync(User user)
        {
            // 0. التحقق من عدم تكرار البريد الإلكتروني
            var emailTaken = await _context.Users.AnyAsync(u => u.Email == user.Email);
            if (emailTaken)
                throw new InvalidOperationException("هذا البريد الإلكتروني مسجل مسبقاً");

            // 1. تشفير كلمة المرور
            // BCrypt بيعمل Hash قوي جداً وبيضيف "Salt" تلقائياً
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(user.PasswordHash);

            // 2. تخزين المستخدم بالباسورد المشفر
            _context.Users.Add(user);
            var result = await _context.SaveChangesAsync();

            if (result > 0)
            {
                // 3. إرسال OTP تلقائياً بعد نجاح التسجيل
                try
                {
                    await _otpService.SendOtpAsync(user.Email, OtpPurpose.EmailVerification);
                }
                catch (Exception ex)
                {
                    // لا نفشّل التسجيل بسبب فشل الإيميل — نسجّل الخطأ فقط
                    Console.WriteLine($"[EmailService] فشل إرسال OTP بعد التسجيل: {ex.Message}");
                }
                return true;
            }

            return false;
        }

        public async Task<LoginResponse?> LoginAsync(string email, string password)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
                return null;

            // sentinel value as a special LoginResponse with empty token
            if (!user.IsEmailVerified)
                return new LoginResponse { AccessToken = "EMAIL_NOT_VERIFIED", RefreshToken = string.Empty };

            return await CreateLoginResponseAsync(user);
        }

        private async Task<LoginResponse> CreateLoginResponseAsync(User user)
        {
            var (accessToken, expiry) = GenerateJwtToken(user);
            var refreshTokenValue = GenerateRefreshToken();

            _context.RefreshTokens.Add(new RefreshToken
            {
                UserId = user.UserID,
                Token = refreshTokenValue,
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                IsRevoked = false,
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            return new LoginResponse
            {
                AccessToken = accessToken,
                RefreshToken = refreshTokenValue,
                AccessTokenExpiry = expiry
            };
        }

        public async Task<LoginResponse?> RefreshTokenAsync(string refreshToken)
        {
            var token = await _context.RefreshTokens
                .Include(rt => rt.User)
                .FirstOrDefaultAsync(rt => rt.Token == refreshToken
                                        && !rt.IsRevoked
                                        && rt.ExpiresAt > DateTime.UtcNow);

            if (token == null) return null;

            // Token rotation: revoke the old token and issue a new pair
            token.IsRevoked = true;
            await _context.SaveChangesAsync();

            return await CreateLoginResponseAsync(token.User);
        }

        public async Task<bool> RevokeTokenAsync(string refreshToken)
        {
            var token = await _context.RefreshTokens
                .FirstOrDefaultAsync(rt => rt.Token == refreshToken && !rt.IsRevoked);

            if (token == null) return false;

            token.IsRevoked = true;
            await _context.SaveChangesAsync();
            return true;
        }
        // دالة إحصائيات النظام (محسّنة)
        public async Task<AdminDashboardStatsDto> GetSystemStatsAsync()
        {
            var totalUsers        = await _context.Users.CountAsync();
            var totalFreelancers  = await _context.Users.CountAsync(u => u.Role == "Freelancer");
            var activeUsers       = await _context.Users.CountAsync(u => u.IsActive);
            var totalOrders       = await _context.Orders.CountAsync();
            var pendingOrders     = await _context.Orders.CountAsync(o => o.Status == OrderStatus.Pending);
            var completedOrders   = await _context.Orders.CountAsync(o => o.Status == OrderStatus.Completed);
            var totalRevenue      = await _context.Payments
                                        .Where(p => p.Status == PaymentStatus.Succeeded)
                                        .SumAsync(p => (decimal?)p.Amount) ?? 0;
            var pendingApprovals  = await _context.FreelancerProfiles
                                        .CountAsync(f => f.ApprovalStatus == ApprovalStatus.Pending);

            // أكثر 5 خدمات طلباً (بناءً على الخدمات المرتبطة بالصنايعيين في الطلبات)
            var topServices = await _context.Orders
                .Include(o => o.Freelancer)
                    .ThenInclude(f => f.FreelancerServices)
                        .ThenInclude(fs => fs.Service)
                .Where(o => o.Freelancer != null)
                .SelectMany(o => o.Freelancer.FreelancerServices.Select(fs => fs.Service.Title))
                .GroupBy(title => title)
                .Select(g => new TopServiceDto { ServiceTitle = g.Key, OrderCount = g.Count() })
                .OrderByDescending(x => x.OrderCount)
                .Take(5)
                .ToListAsync();

            return new AdminDashboardStatsDto
            {
                TotalUsers = totalUsers,
                TotalFreelancers = totalFreelancers,
                ActiveUsers = activeUsers,
                TotalOrders = totalOrders,
                PendingOrders = pendingOrders,
                CompletedOrders = completedOrders,
                TotalRevenue = totalRevenue,
                PendingFreelancerApprovals = pendingApprovals,
                TopServices = topServices
            };
        }

        // دالة حظر / فك حظر المستخدم (Toggle)
        public async Task<bool> ToggleUserStatusAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return false;

            user.IsActive = !user.IsActive;
            await _context.SaveChangesAsync();
            return true;
        }

        // Soft Delete — بدل الحذف النهائي
        public async Task<bool> SoftDeleteUserAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return false;

            user.IsDeleted = true;
            user.DeletedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        // جلب المستخدمين المحذوفين (للأرشيف — يتجاوز الـ Global Filter)
        public async Task<IEnumerable<User>> GetDeletedUsersAsync()
        {
            return await _context.Users
                .IgnoreQueryFilters()
                .Where(u => u.IsDeleted)
                .ToListAsync();
        }
    }
}