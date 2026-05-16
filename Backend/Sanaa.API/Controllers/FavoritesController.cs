using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sanaa.BLL.Interfaces;
using System.Security.Claims;

namespace Sanaa.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class FavoritesController(IFavoritesService favoritesService) : ControllerBase
    {
        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(claim, out int id) ? id : null;
        }

        /// <summary>جلب جميع الخدمات المفضلة للمستخدم الحالي</summary>
        [HttpGet]
        public async Task<IActionResult> GetFavorites()
        {
            int? userId = GetCurrentUserId();
            if (userId is null) return Unauthorized("User not authenticated.");

            var favorites = await favoritesService.GetAllAsync(userId.Value);
            return Ok(favorites);
        }

        /// <summary>إضافة خدمة للمفضلة</summary>
        [HttpPost("{serviceId:int}")]
        public async Task<IActionResult> AddFavorite(int serviceId)
        {
            int? userId = GetCurrentUserId();
            if (userId is null) return Unauthorized("User not authenticated.");

            bool added = await favoritesService.AddAsync(userId.Value, serviceId);

            return added
                ? Ok("Service added to favorites.")
                : BadRequest("Service is already in favorites or does not exist.");
        }

        /// <summary>حذف خدمة من المفضلة</summary>
        [HttpDelete("{serviceId:int}")]
        public async Task<IActionResult> RemoveFavorite(int serviceId)
        {
            int? userId = GetCurrentUserId();
            if (userId is null) return Unauthorized("User not authenticated.");

            bool removed = await favoritesService.RemoveAsync(userId.Value, serviceId);

            return removed
                ? Ok("Service removed from favorites.")
                : NotFound("Service not found in favorites.");
        }
    }
}
