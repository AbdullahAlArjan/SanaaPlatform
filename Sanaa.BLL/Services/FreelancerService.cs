using Microsoft.EntityFrameworkCore;
using Sanaa.BLL.Interfaces;
using Sanaa.DAL;
using Sanaa.DAL.Entities;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Sanaa.BLL.DTOs;

namespace Sanaa.BLL.Services
{
    public class FreelancerService : IFreelancerService
    {
        private readonly SanaaDbContext _context;

        public FreelancerService(SanaaDbContext context)
        {
            _context = context;
        }

        public async Task<bool> CreateProfileAsync(int userId, string profession, int experienceYears, string city, List<int> serviceIds)
        {
            var user = await _context.Users
                .Include(u => u.FreelancerProfile)
                .FirstOrDefaultAsync(u => u.UserID == userId);

            if (user == null || user.FreelancerProfile != null)
                return false;

            var profile = new FreelancerProfile
            {
                FreelancerID = userId, // إذا ضل تحته خط أحمر، تأكد إنك كاتبها UserId أو UserID بالكلاس
                Profession = profession,
                ExperienceYears = experienceYears,
                City = city,
                AverageRating = 0,
                // السحر الجديد: نستخدم المسار الكامل لجدول الكسر عشان نربط الخدمات
                FreelancerServices = serviceIds.Select(id => new Sanaa.DAL.Entities.FreelancerService { ServiceID = id }).ToList()
            };

            _context.FreelancerProfiles.Add(profile);
            var result = await _context.SaveChangesAsync();

            return result > 0;
        }

        public async Task<FreelancerProfileResponse> GetProfileByUserIdAsync(int userId)
        {
            // بنجيب الملف مع جدول الكسر (FreelancerServices) ومع جدول الخدمات (Service)
            var profile = await _context.FreelancerProfiles
                .Include(p => p.FreelancerServices)
                    .ThenInclude(fs => fs.Service)
                .FirstOrDefaultAsync(p => p.FreelancerID == userId); // تذكر إنك مسميها FreelancerID

            if (profile == null) return null;

            // بنحول الداتا المعقدة لـ DTO نظيف
            return new FreelancerProfileResponse
            {
                UserID = profile.FreelancerID,
                Profession = profile.Profession,
                ExperienceYears = profile.ExperienceYears,
                City = profile.City,
                AverageRating = profile.AverageRating,
                // بنلف على جدول الكسر ونسحب "عنوان" الخدمة بس
                Services = profile.FreelancerServices.Select(fs => fs.Service.Title).ToList()
            };
        }

        public async Task<IEnumerable<FreelancerProfileResponse>> SearchFreelancersAsync(string? profession, string? city, int? serviceId)
        {
            // 1. بنجهز الطلب الأساسي مع الجداول المرتبطة (بدون ما نبعثه للداتا بيس لسا)
            var query = _context.FreelancerProfiles
                .Include(p => p.FreelancerServices)
                    .ThenInclude(fs => fs.Service)
                .AsQueryable(); // AsQueryable يعني "استنى شوي لا تنفذ، لسا بدي أضيف فلاتر"

            // 2. إذا العميل كتب اسم مهنة، بنفلتر عليها (Contains عشان تجيب الكلمة حتى لو جزء من الجملة)
            if (!string.IsNullOrEmpty(profession))
            {
                query = query.Where(p => p.Profession.Contains(profession));
            }

            // 3. إذا العميل حدد مدينة، بنفلتر عليها
            if (!string.IsNullOrEmpty(city))
            {
                query = query.Where(p => p.City == city);
            }

            // 4. إذا العميل اختار رقم خدمة معينة (مثلا خدمة رقم 1)، بنجيب العمال اللي عندهم هاي الخدمة
            if (serviceId.HasValue && serviceId.Value > 0)
            {
                query = query.Where(p => p.FreelancerServices.Any(fs => fs.ServiceID == serviceId.Value));
            }

            // 5. هسا بعد ما ركبنا كل الفلاتر، بنبعث الطلب للداتا بيس
            var profiles = await query.ToListAsync();

            // 6. بنحول النتيجة لـ DTO النظيف تبعنا
            return profiles.Select(p => new FreelancerProfileResponse
            {
                UserID = p.FreelancerID,
                Profession = p.Profession,
                ExperienceYears = p.ExperienceYears,
                City = p.City,
                AverageRating = p.AverageRating,
                Services = p.FreelancerServices.Select(fs => fs.Service.Title).ToList()
            });
        }
    }
}