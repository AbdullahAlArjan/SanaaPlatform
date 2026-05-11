using Microsoft.EntityFrameworkCore;
using Sanaa.BLL.Interfaces;
using Sanaa.BLL.DTOs;
using Sanaa.DAL;
using Sanaa.DAL.Entities;
using System.Collections.Generic;
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

        // 1. جلب كل الخدمات المتاحة
        public async Task<IEnumerable<Service>> GetAllServicesAsync()
        {
            return await _context.Services.ToListAsync();
        }

        // 2. جلب خدمة معينة حسب الرقم
        public async Task<Service> GetServiceByIdAsync(int id)
        {
            return await _context.Services.FindAsync(id);
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