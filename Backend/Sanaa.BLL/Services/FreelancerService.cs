using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Sanaa.BLL.Interfaces;
using Sanaa.DAL;
using Sanaa.DAL.Entities;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Sanaa.BLL.DTOs;

namespace Sanaa.BLL.Services
{
    public class FreelancerService : IFreelancerService
    {
        private readonly SanaaDbContext _context;
        private readonly IFileUploadService _fileUploadService;

        public FreelancerService(SanaaDbContext context, IFileUploadService fileUploadService)
        {
            _context = context;
            _fileUploadService = fileUploadService;
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
            var profile = await _context.FreelancerProfiles
                .Include(p => p.User)
                .Include(p => p.FreelancerServices)
                    .ThenInclude(fs => fs.Service)
                .FirstOrDefaultAsync(p => p.FreelancerID == userId);

            if (profile == null) return null;
            return MapToResponse(profile);
        }

        public async Task<IEnumerable<FreelancerProfileResponse>> SearchFreelancersAsync(
            string? profession, string? city, int? serviceId)
        {
            var query = _context.FreelancerProfiles
                .Include(p => p.User)
                .Include(p => p.FreelancerServices)
                    .ThenInclude(fs => fs.Service)
                .Where(p => p.ApprovalStatus == ApprovalStatus.Approved) // فقط الموافق عليهم
                .AsQueryable();

            if (!string.IsNullOrEmpty(profession))
                query = query.Where(p => p.Profession.Contains(profession));

            if (!string.IsNullOrEmpty(city))
                query = query.Where(p => p.City == city);

            if (serviceId.HasValue && serviceId.Value > 0)
                query = query.Where(p => p.FreelancerServices.Any(fs => fs.ServiceID == serviceId.Value));

            var profiles = await query.ToListAsync();
            return profiles.Select(MapToResponse);
        }

        public async Task<string> UploadProfileImageAsync(int freelancerId, IFormFile file)
        {
            var profile = await _context.FreelancerProfiles.FindAsync(freelancerId);
            if (profile == null)
                throw new ArgumentException("الملف الشخصي غير موجود");

            // حذف الصورة القديمة إن وجدت
            if (!string.IsNullOrEmpty(profile.ProfileImageUrl))
                _fileUploadService.DeleteImage(profile.ProfileImageUrl);

            profile.ProfileImageUrl = await _fileUploadService.SaveImageAsync(file, "profiles");
            await _context.SaveChangesAsync();
            return profile.ProfileImageUrl;
        }

        public async Task<List<string>> AddPortfolioImageAsync(int freelancerId, IFormFile file)
        {
            var profile = await _context.FreelancerProfiles.FindAsync(freelancerId);
            if (profile == null)
                throw new ArgumentException("الملف الشخصي غير موجود");

            var images = string.IsNullOrEmpty(profile.PortfolioImagesJson)
                ? []
                : JsonSerializer.Deserialize<List<string>>(profile.PortfolioImagesJson) ?? [];

            if (images.Count >= 5)
                throw new InvalidOperationException("وصلت للحد الأقصى (5 صور)");

            var url = await _fileUploadService.SaveImageAsync(file, "portfolio");
            images.Add(url);
            profile.PortfolioImagesJson = JsonSerializer.Serialize(images);
            await _context.SaveChangesAsync();
            return images;
        }

        public async Task<List<string>> RemovePortfolioImageAsync(int freelancerId, string imageUrl)
        {
            var profile = await _context.FreelancerProfiles.FindAsync(freelancerId);
            if (profile == null)
                throw new ArgumentException("الملف الشخصي غير موجود");

            var images = string.IsNullOrEmpty(profile.PortfolioImagesJson)
                ? []
                : JsonSerializer.Deserialize<List<string>>(profile.PortfolioImagesJson) ?? [];

            if (!images.Remove(imageUrl))
                throw new ArgumentException("الصورة غير موجودة");

            _fileUploadService.DeleteImage(imageUrl);
            profile.PortfolioImagesJson = images.Count > 0 ? JsonSerializer.Serialize(images) : null;
            await _context.SaveChangesAsync();
            return images;
        }

        public async Task<List<string>> GetPortfolioImagesAsync(int freelancerId)
        {
            var profile = await _context.FreelancerProfiles.FindAsync(freelancerId);
            if (profile == null || string.IsNullOrEmpty(profile.PortfolioImagesJson))
                return [];

            return JsonSerializer.Deserialize<List<string>>(profile.PortfolioImagesJson) ?? [];
        }

        // ── نظام الموافقة (Admin) ─────────────────────────────────

        public async Task<bool> ApproveFreelancerAsync(int freelancerId)
        {
            var profile = await _context.FreelancerProfiles.FindAsync(freelancerId);
            if (profile == null) return false;

            profile.ApprovalStatus = ApprovalStatus.Approved;
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<bool> RejectFreelancerAsync(int freelancerId)
        {
            var profile = await _context.FreelancerProfiles.FindAsync(freelancerId);
            if (profile == null) return false;

            profile.ApprovalStatus = ApprovalStatus.Rejected;
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<IEnumerable<FreelancerProfileResponse>> GetPendingFreelancersAsync()
        {
            var profiles = await _context.FreelancerProfiles
                .Include(p => p.User)
                .Include(p => p.FreelancerServices)
                    .ThenInclude(fs => fs.Service)
                .Where(p => p.ApprovalStatus == ApprovalStatus.Pending)
                .ToListAsync();

            return profiles.Select(MapToResponse);
        }

        // ── Helper ────────────────────────────────────────────────

        private FreelancerProfileResponse MapToResponse(FreelancerProfile p)
        {
            var portfolioImages = string.IsNullOrEmpty(p.PortfolioImagesJson)
                ? null
                : JsonSerializer.Deserialize<List<string>>(p.PortfolioImagesJson);

            return new FreelancerProfileResponse
            {
                UserID = p.FreelancerID,
                FullName = p.User?.FullName ?? string.Empty,
                Profession = p.Profession,
                ExperienceYears = p.ExperienceYears,
                City = p.City,
                AvailabilityStatus = p.AvailabilityStatus,
                AverageRating = p.AverageRating,
                ProfileImageUrl = p.ProfileImageUrl,
                PortfolioImages = portfolioImages,
                ApprovalStatus = p.ApprovalStatus.ToString(),
                Services = p.FreelancerServices?.Select(fs => fs.Service?.Title ?? string.Empty).ToList() ?? new()
            };
        }
    }
}