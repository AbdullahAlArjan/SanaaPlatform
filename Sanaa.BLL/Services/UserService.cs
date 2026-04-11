using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
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
using System.Text;
using System.Threading.Tasks;
using Sanaa.BLL.DTOs;
namespace Sanaa.BLL.Services
{
    // بنخلي الكلاس يورث من الـ Interface عشان نلتزم بالعقد
    public class UserService : IUserService
    {
        private readonly SanaaDbContext _context;
        private readonly IConfiguration _configuration;

        // 1. Dependency Injection: بنطلب نسخة من الداتا بيس عشان نستخدمها
        public UserService(SanaaDbContext context , IConfiguration configuration)
        {
            _context = context; 
            _configuration = configuration;
        }
        private string GenerateJwtToken(User user)
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

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddDays(1), // التذكرة صالحة ليوم واحد
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
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
            // 1. تشفير كلمة المرور
            // BCrypt بيعمل Hash قوي جداً وبيضيف "Salt" تلقائياً
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(user.PasswordHash);

            // 2. تخزين المستخدم بالباسورد المشفر
            _context.Users.Add(user);
            var result = await _context.SaveChangesAsync();

            return result > 0;
        }

        public async Task<string> LoginAsync(string email, string password)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);

            // التأكد من الإيميل والباسورد المشفر
            if (user == null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            {
                return null;
            }

            // إذا الإيميل ما تم التحقق منه بعد
            if (!user.IsEmailVerified)
            {
                return "EMAIL_NOT_VERIFIED";
            }

            return GenerateJwtToken(user);
        }
        // دالة إحصائيات النظام
        public async Task<AdminDashboardStatsDto> GetSystemStatsAsync()
        {
            var totalUsers = await _context.Users.CountAsync();

            // بنعد كم صنايعي عندنا
            var totalFreelancers = await _context.Users.CountAsync(u => u.Role == "Freelancer");

            // بنعد الحسابات اللي الـ IsActive تبعها true
            var activeUsers = await _context.Users.CountAsync(u => u.IsActive);

            return new AdminDashboardStatsDto
            {
                TotalUsers = totalUsers,
                TotalFreelancers = totalFreelancers,
                ActiveUsers = activeUsers
            };
        }

        // دالة حظر / فك حظر المستخدم (Toggle)
        public async Task<bool> ToggleUserStatusAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return false;

            // السحر هون: إذا كان true بصير false، وإذا كان false بصير true
            user.IsActive = !user.IsActive;

            await _context.SaveChangesAsync();
            return true;
        }
    }
}