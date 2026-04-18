using Microsoft.EntityFrameworkCore;
using Sanaa.BLL.Interfaces;
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
        public async Task<bool> AddServiceAsync(Service service)
        {
            _context.Services.Add(service);
            var result = await _context.SaveChangesAsync();
            return result > 0;
        }
    }
}