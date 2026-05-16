using Microsoft.EntityFrameworkCore;
using Sanaa.BLL.Interfaces;
using Sanaa.BLL.DTOs;
using Sanaa.DAL;
using Sanaa.DAL.Entities;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;

namespace Sanaa.BLL.Services
{
    public class ServiceService : IServiceService
    {
        private readonly SanaaDbContext _context;

        public ServiceService(SanaaDbContext context)
        {
            _context = context;
        }

        // 1. جلب كل الخدمات المتاحة (مع دعم الفلترة بالفئة)
        public async Task<IEnumerable<Service>> GetAllServicesAsync(int? categoryId = null)
        {
            var query = _context.Services
                .Where(s => s.IsActive)
                .AsQueryable();

            if (categoryId.HasValue)
                query = query.Where(s => s.CategoryID == categoryId.Value);

            return await query.OrderByDescending(s => s.CreatedAt).ToListAsync();
        }

        // 2a. Simple entity lookup (kept for backward compatibility)
        public async Task<Service> GetServiceByIdAsync(int id)
        {
            return await _context.Services.FindAsync(id);
        }

        // 2b. Rich detail including category + freelancer — used by the public service-detail page
        public async Task<ServiceDetailDto?> GetServiceDetailAsync(int id)
        {
            var service = await _context.Services
                .Include(s => s.Category)
                .Include(s => s.FreelancerServices)
                    .ThenInclude(fs => fs.FreelancerProfile)
                        .ThenInclude(fp => fp.User)
                .FirstOrDefaultAsync(s => s.ServiceID == id);

            if (service is null) return null;

            // FreelancerService entity guarantees one-owner-per-service in our flow
            var link = service.FreelancerServices?.FirstOrDefault();
            var fp   = link?.FreelancerProfile;

            var imageUrls = string.IsNullOrEmpty(service.ImageUrlsJson)
                ? new List<string>()
                : JsonSerializer.Deserialize<List<string>>(service.ImageUrlsJson) ?? new();

            return new ServiceDetailDto
            {
                ServiceID           = service.ServiceID,
                Title               = service.Title,
                Description         = service.Description,
                BasePrice           = service.BasePrice,
                IsActive            = service.IsActive,
                CreatedAt           = service.CreatedAt,
                CategoryID          = service.CategoryID,
                CategoryName        = service.Category?.Name,
                ImageUrls           = imageUrls,
                FreelancerID        = fp?.FreelancerID,
                FreelancerName      = fp?.User?.FullName,
                FreelancerAvatarUrl = fp?.ProfileImageUrl,
                FreelancerRating    = fp?.AverageRating ?? 0,
                FreelancerCity      = fp?.City,
                FreelancerBio       = fp?.Bio,
            };
        }

        // 3. إضافة خدمة جديدة للمنصة
        public async Task<bool> AddServiceAsync(CreateServiceRequest request)
        {
            var service = new Service
            {
                CategoryID = request.CategoryID,
                Title = request.Title,
                Description = request.Description,
                BasePrice = request.BasePrice,
                IsActive = true,
                CreatedAt = System.DateTime.Now
            };
            _context.Services.Add(service);
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<bool> UpdateServiceAsync(int id, UpdateServiceRequest request)
        {
            var service = await _context.Services.FindAsync(id);
            if (service == null) return false;

            service.CategoryID = request.CategoryID;
            service.Title = request.Title;
            service.Description = request.Description;
            service.BasePrice = request.BasePrice;
            service.IsActive = request.IsActive;

            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<bool> DeleteServiceAsync(int id)
        {
            var service = await _context.Services.FindAsync(id);
            if (service == null) return false;

            _context.Services.Remove(service);
            return await _context.SaveChangesAsync() > 0;
        }
    }
}