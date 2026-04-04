using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Sanaa.BLL.Interfaces;
using System.IdentityModel.Tokens.Jwt;
using Sanaa.DAL;
using System.Security.Claims;
using System.Text;
using Sanaa.DAL.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;
using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
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
        public async Task<IEnumerable<User>> GetAllUsersAsync()
        {
            return await _context.Users.ToListAsync();
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
                return null; // إذا في غلط بنرجع null
            }

            // إذا كل إشي تمام، بنولد التذكرة وبنرجعها
            return GenerateJwtToken(user);
        }
    }
}