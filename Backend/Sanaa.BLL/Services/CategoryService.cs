using Microsoft.EntityFrameworkCore;
using Sanaa.BLL.DTOs;
using Sanaa.BLL.Interfaces;
using Sanaa.DAL;
using Sanaa.DAL.Entities;
using System;
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

        // 1. جلب الأقسام مع بحث + pagination
        public async Task<PagedResponse<CategoryResponseDto>> GetAllCategoriesAsync(
            string? search, int page, int pageSize)
        {
            var query = _context.Categories.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(c =>
                    c.Name.Contains(search) ||
                    (c.Description != null && c.Description.Contains(search)));

            var total = await query.CountAsync();
            var items = await query
                .OrderBy(c => c.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(c => new CategoryResponseDto
                {
                    CategoryID = c.CategoryID,
                    Name = c.Name,
                    Description = c.Description,
                    ImageUrl = c.ImageUrl
                })
                .ToListAsync();

            return new PagedResponse<CategoryResponseDto>
            {
                Data = items,
                TotalCount = total,
                PageNumber = page,
                PageSize = pageSize
            };
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
            return await _context.SaveChangesAsync() > 0;
        }

        // 4. تعديل قسم موجود
        public async Task<bool> UpdateCategoryAsync(int id, CreateCategoryDto dto)
        {
            var category = await _context.Categories.FindAsync(id);
            if (category == null) return false;

            category.Name = dto.Name;
            category.Description = dto.Description;
            category.ImageUrl = dto.ImageUrl;

            return await _context.SaveChangesAsync() > 0;
        }

        // 5. حذف قسم
        public async Task<bool> DeleteCategoryAsync(int id)
        {
            var category = await _context.Categories.FindAsync(id);
            if (category == null) return false;

            _context.Categories.Remove(category);
            return await _context.SaveChangesAsync() > 0;
        }
    }
}
