using Microsoft.EntityFrameworkCore;
using Sanaa.BLL.DTOs;
using Sanaa.BLL.Interfaces;
using Sanaa.DAL;
using Sanaa.DAL.Entities;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Sanaa.BLL.Services
{
    public class CategoryService : ICategoryService
    {
        private readonly SanaaDbContext _context;

        public CategoryService(SanaaDbContext context)
        {
            _context = context;
        }

        // 1. جلب كل الأقسام (بدون الخدمات)
        public async Task<IEnumerable<CategoryResponseDto>> GetAllCategoriesAsync()
        {
            return await _context.Categories
                .Select(c => new CategoryResponseDto
                {
                    CategoryID = c.CategoryID,
                    Name = c.Name,
                    Description = c.Description,
                    ImageUrl = c.ImageUrl
                })
                .ToListAsync();
        }

        // 2. جلب قسم معين مع خدماته
        public async Task<CategoryWithServicesDto> GetCategoryWithServicesAsync(int id)
        {
            var category = await _context.Categories
                .Include(c => c.Services)
                .FirstOrDefaultAsync(c => c.CategoryID == id);

            if (category == null) return null;

            return new CategoryWithServicesDto
            {
                CategoryID = category.CategoryID,
                Name = category.Name,
                Description = category.Description,
                ImageUrl = category.ImageUrl,
                Services = category.Services.Select(s => new ServiceSummaryDto
                {
                    ServiceID = s.ServiceID,
                    Title = s.Title,
                    BasePrice = s.BasePrice
                }).ToList()
            };
        }

        // 3. إضافة قسم جديد
        public async Task<bool> CreateCategoryAsync(CreateCategoryDto dto)
        {
            var category = new Category
            {
                Name = dto.Name,
                Description = dto.Description,
                ImageUrl = dto.ImageUrl
            };

            _context.Categories.Add(category);
            var result = await _context.SaveChangesAsync();
            return result > 0;
        }

        // 4. تعديل قسم موجود
        public async Task<bool> UpdateCategoryAsync(int id, CreateCategoryDto dto)
        {
            var category = await _context.Categories.FindAsync(id);
            if (category == null) return false;

            category.Name = dto.Name;
            category.Description = dto.Description;
            category.ImageUrl = dto.ImageUrl;

            var result = await _context.SaveChangesAsync();
            return result > 0;
        }

        // 5. حذف قسم
        public async Task<bool> DeleteCategoryAsync(int id)
        {
            var category = await _context.Categories.FindAsync(id);
            if (category == null) return false;

            _context.Categories.Remove(category);
            var result = await _context.SaveChangesAsync();
            return result > 0;
        }
    }
}
