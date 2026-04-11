using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sanaa.BLL.DTOs;
using Sanaa.BLL.Interfaces;
using System.Threading.Tasks;

namespace Sanaa.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CategoriesController : ControllerBase
    {
        private readonly ICategoryService _categoryService;

        public CategoriesController(ICategoryService categoryService)
        {
            _categoryService = categoryService;
        }

        // ─── عمليات القراءة (متاحة للجميع) ───────────────────────────────

        // GET /api/categories
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAllCategories()
        {
            var categories = await _categoryService.GetAllCategoriesAsync();
            return Ok(categories);
        }

        // GET /api/categories/{id}
        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetCategoryWithServices(int id)
        {
            var category = await _categoryService.GetCategoryWithServicesAsync(id);
            if (category == null)
                return NotFound("القسم غير موجود");

            return Ok(category);
        }

        // ─── عمليات الكتابة (مخصصة للأدمن فقط) ──────────────────────────

        // POST /api/categories
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryDto dto)
        {
            var result = await _categoryService.CreateCategoryAsync(dto);
            if (result)
                return Ok("تمت إضافة القسم بنجاح");

            return BadRequest("فشلت عملية إضافة القسم");
        }

        // PUT /api/categories/{id}
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateCategory(int id, [FromBody] CreateCategoryDto dto)
        {
            var result = await _categoryService.UpdateCategoryAsync(id, dto);
            if (!result)
                return NotFound("القسم غير موجود");

            return Ok("تم تحديث القسم بنجاح");
        }

        // DELETE /api/categories/{id}
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteCategory(int id)
        {
            var result = await _categoryService.DeleteCategoryAsync(id);
            if (!result)
                return NotFound("القسم غير موجود");

            return Ok("تم حذف القسم بنجاح");
        }
    }
}
