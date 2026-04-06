using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sanaa.BLL.Interfaces;
using System.Threading.Tasks;

namespace Sanaa.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    // السطر الذهبي: أي دالة جوا هاد الكنترولر بتحتاج توكن بصلاحية Admin حصراً!
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly IUserService _userService;

        public AdminController(IUserService userService)
        {
            _userService = userService;
        }

        // 1. جلب الإحصائيات
        [HttpGet("dashboard-stats")]
        public async Task<IActionResult> GetDashboardStats()
        {
            var stats = await _userService.GetSystemStatsAsync();
            return Ok(stats);
        }

        // 2. حظر أو فك حظر مستخدم
        [HttpPut("toggle-user-status/{id}")]
        public async Task<IActionResult> ToggleUserStatus(int id)
        {
            var success = await _userService.ToggleUserStatusAsync(id);
            if (!success)
                return NotFound("المستخدم غير موجود.");

            return Ok(new { Message = "تم تحديث حالة المستخدم بنجاح." });
        }
    }
}