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

        // ── Onboarding Upsert ─────────────────────────────────────────────────────

        /// <summary>
        /// Atomically upgrades the user's role to "Freelancer" and creates a
        /// skeleton FreelancerProfile if one does not already exist.
        /// Idempotent — safe to call multiple times.
        /// </summary>
        public async Task EnsureProfileExistsAsync(int userId)
        {
            var user = await _context.Users
                .Include(u => u.FreelancerProfile)
                .FirstOrDefaultAsync(u => u.UserID == userId)
                ?? throw new ArgumentException($"User {userId} not found.");

            // Promote role if still Client
            if (!string.Equals(user.Role, "Freelancer", StringComparison.OrdinalIgnoreCase))
                user.Role = "Freelancer";

            // Create skeleton profile only when it doesn't exist yet
            if (user.FreelancerProfile is null)
            {
                _context.FreelancerProfiles.Add(new FreelancerProfile
                {
                    FreelancerID    = userId,
                    Profession      = "Not specified",   // placeholder (required column)
                    ExperienceYears = 0,
                    City            = string.Empty,
                    ApprovalStatus  = ApprovalStatus.Pending,
                    AverageRating   = 0
                });
            }

            await _context.SaveChangesAsync();
        }

        public async Task<FreelancerProfileResponse?> GetProfileByUserIdAsync(int userId)
        {
            var profile = await _context.FreelancerProfiles
                .Include(p => p.User)
                .Include(p => p.FreelancerServices)
                    .ThenInclude(fs => fs.Service)
                .FirstOrDefaultAsync(p => p.FreelancerID == userId);

            if (profile == null) return null;
            return MapToResponse(profile);
        }

        public async Task<FreelancerProfileResponse?> UpdateProfileAsync(int userId, UpdateFreelancerProfileDto dto)
        {
            var profile = await _context.FreelancerProfiles
                .Include(p => p.User)
                .Include(p => p.FreelancerServices)
                    .ThenInclude(fs => fs.Service)
                .FirstOrDefaultAsync(p => p.FreelancerID == userId);

            if (profile is null)
            {
                // Upsert: no profile yet — ensure the skeleton exists, then re-query
                await EnsureProfileExistsAsync(userId);
                profile = await _context.FreelancerProfiles
                    .Include(p => p.User)
                    .Include(p => p.FreelancerServices)
                        .ThenInclude(fs => fs.Service)
                    .FirstOrDefaultAsync(p => p.FreelancerID == userId);

                if (profile is null) return null; // user doesn't exist at all
            }

            if (dto.Profession is not null) profile.Profession = dto.Profession;
            if (dto.City       is not null) profile.City       = dto.City;
            if (dto.Bio        is not null) profile.Bio        = dto.Bio;
            if (dto.Phone      is not null) profile.Phone      = dto.Phone;

            await _context.SaveChangesAsync();
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

        public async Task<IEnumerable<FreelancerProfileResponse>> GetAllFreelancerProfilesAsync()
        {
            var profiles = await _context.FreelancerProfiles
                .Include(p => p.User)
                .Include(p => p.FreelancerServices)
                    .ThenInclude(fs => fs.Service)
                .ToListAsync();

            return profiles.Select(MapToResponse);
        }

        // ── خدمات الصنايعي الخاصة (my-services) ─────────────────────────────────

        // ── Service Images ────────────────────────────────────────────────────────

        /// <summary>
        /// Appends uploaded images to the service's ImageUrlsJson column.
        /// Ownership is verified: the freelancer must own this service.
        /// Returns the updated list of all image URLs, or null if not authorised.
        /// </summary>
        public async Task<List<string>?> AddServiceImagesAsync(int freelancerId, int serviceId, IFormFileCollection files)
        {
            // Verify ownership via junction table
            var link = await _context.Set<Sanaa.DAL.Entities.FreelancerService>()
                .FirstOrDefaultAsync(fs => fs.FreelancerID == freelancerId && fs.ServiceID == serviceId);
            if (link is null) return null;

            var service = await _context.Services.FindAsync(serviceId);
            if (service is null) return null;

            var existing = string.IsNullOrEmpty(service.ImageUrlsJson)
                ? new List<string>()
                : JsonSerializer.Deserialize<List<string>>(service.ImageUrlsJson) ?? new();

            foreach (var file in files)
            {
                if (file?.Length > 0)
                {
                    var url = await _fileUploadService.SaveImageAsync(file, "services");
                    existing.Add(url);
                }
            }

            service.ImageUrlsJson = JsonSerializer.Serialize(existing);
            await _context.SaveChangesAsync();
            return existing;
        }

        // Public — returns active services for any freelancer (used by the public profile page)
        public async Task<IEnumerable<FreelancerServiceDto>> GetUserServicesAsync(int userId)
        {
            return await _context.Set<Sanaa.DAL.Entities.FreelancerService>()
                .Where(fs => fs.FreelancerID == userId)
                .Include(fs => fs.Service)
                .Where(fs => fs.Service != null && fs.Service.IsActive)
                .Select(fs => new FreelancerServiceDto
                {
                    ServiceID   = fs.Service.ServiceID,
                    CategoryID  = fs.Service.CategoryID,
                    Title       = fs.Service.Title,
                    Description = fs.Service.Description,
                    BasePrice   = fs.Service.BasePrice,
                    IsActive    = fs.Service.IsActive
                })
                .ToListAsync();
        }

        public async Task<FreelancerServiceDto?> AddMyServiceAsync(int freelancerId, CreateServiceRequest req)
        {
            var profile = await _context.FreelancerProfiles.FindAsync(freelancerId);
            if (profile is null) return null;   // no profile → controller returns 400

            // Profile completeness gate — Bio, Profession (not placeholder), and Phone required
            if (string.IsNullOrWhiteSpace(profile.Bio)        ||
                string.IsNullOrWhiteSpace(profile.Profession) ||
                profile.Profession == "Not specified"         ||
                string.IsNullOrWhiteSpace(profile.Phone))
            {
                throw new InvalidOperationException("PROFILE_INCOMPLETE");
            }

            // 1. Create the Service record in the Services catalog
            var service = new Service
            {
                CategoryID  = req.CategoryID,
                Title       = req.Title ?? string.Empty,
                Description = req.Description,
                BasePrice   = (decimal)req.BasePrice,
                IsActive    = true,
                CreatedAt   = DateTime.UtcNow
            };
            _context.Services.Add(service);
            await _context.SaveChangesAsync(); // materialise ServiceID

            // 2. Link via FreelancerServices junction table
            _context.Set<Sanaa.DAL.Entities.FreelancerService>().Add(
                new Sanaa.DAL.Entities.FreelancerService
                {
                    FreelancerID = freelancerId,
                    ServiceID    = service.ServiceID
                });
            await _context.SaveChangesAsync();

            return MapServiceDto(service);
        }

        public async Task<IEnumerable<FreelancerServiceDto>> GetMyServicesAsync(int freelancerId)
        {
            var services = await _context.Set<Sanaa.DAL.Entities.FreelancerService>()
                .Where(fs => fs.FreelancerID == freelancerId)
                .Include(fs => fs.Service)
                .Select(fs => fs.Service)
                .ToListAsync();

            return services.Select(MapServiceDto);
        }

        public async Task<bool> UpdateMyServiceAsync(int freelancerId, int serviceId, UpdateServiceRequest req)
        {
            // Verify the freelancer owns this service
            var link = await _context.Set<Sanaa.DAL.Entities.FreelancerService>()
                .FirstOrDefaultAsync(fs => fs.FreelancerID == freelancerId && fs.ServiceID == serviceId);
            if (link == null) return false;

            var service = await _context.Services.FindAsync(serviceId);
            if (service == null) return false;

            if (req.CategoryID  is not null) service.CategoryID  = req.CategoryID;
            if (req.Title       is not null) service.Title       = req.Title;
            if (req.Description is not null) service.Description = req.Description;
            service.BasePrice = (decimal)req.BasePrice;
            service.IsActive  = req.IsActive;

            return await _context.SaveChangesAsync() > 0;
        }

        private static FreelancerServiceDto MapServiceDto(Service s) => new()
        {
            ServiceID   = s.ServiceID,
            CategoryID  = s.CategoryID,
            Title       = s.Title,
            Description = s.Description,
            BasePrice   = s.BasePrice,
            IsActive    = s.IsActive,
            ImageUrls   = string.IsNullOrEmpty(s.ImageUrlsJson)
                          ? new List<string>()
                          : JsonSerializer.Deserialize<List<string>>(s.ImageUrlsJson) ?? new()
        };

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
                Email = p.User?.Email ?? string.Empty,
                Profession = p.Profession,
                Bio = p.Bio,
                Phone = p.Phone,
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