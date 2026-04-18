using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sanaa.BLL.Interfaces;
using System.Threading.Tasks;

namespace Sanaa.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly IFreelancerService _freelancerService;

        public AdminController(IUserService userService, IFreelancerService freelancerService)
        {
            _userService = userService;
            _freelancerService = freelancerService;
        }

        // ── Dashboard ─────────────────────────────────────────────

        // GET /api/admin/dashboard-stats
        [HttpGet("dashboard-stats")]
        public async Task<IActionResult> GetDashboardStats()
        {
            var stats = await _userService.GetSystemStatsAsync();
            return Ok(stats);
        }

        // ── إدارة المستخدمين ──────────────────────────────────────

        // PUT /api/admin/toggle-user-status/{id}
        [HttpPut("toggle-user-status/{id}")]
        public async Task<IActionResult> ToggleUserStatus(int id)
        {
            var success = await _userService.ToggleUserStatusAsync(id);
            if (!success)
                return NotFound("المستخدم غير موجود.");

            return Ok(new { Message = "تم تحديث حالة المستخدم بنجاح." });
        }

        // DELETE /api/admin/users/{id}  (Soft Delete)
        [HttpDelete("users/{id}")]
        public async Task<IActionResult> SoftDeleteUser(int id)
        {
            var success = await _userService.SoftDeleteUserAsync(id);
            if (!success)
                return NotFound("المستخدم غير موجود.");

            return Ok(new { Message = "تم حذف المستخدم (Soft Delete) بنجاح." });
        }

        // GET /api/admin/users/deleted
        [HttpGet("users/deleted")]
        public async Task<IActionResult> GetDeletedUsers()
        {
            var users = await _userService.GetDeletedUsersAsync();
            return Ok(users);
        }

        // ── موافقة الصنايعيين ──────────────────────────────────────

        // GET /api/admin/freelancers/pending
        [HttpGet("freelancers/pending")]
        public async Task<IActionResult> GetPendingFreelancers()
        {
            var freelancers = await _freelancerService.GetPendingFreelancersAsync();
            return Ok(freelancers);
        }

        // PUT /api/admin/freelancers/{id}/approve
        [HttpPut("freelancers/{id}/approve")]
        public async Task<IActionResult> ApproveFreelancer(int id)
        {
            var success = await _freelancerService.ApproveFreelancerAsync(id);
            if (!success)
                return NotFound("الصنايعي غير موجود.");

            return Ok(new { Message = "تمت الموافقة على الصنايعي بنجاح." });
        }

        // PUT /api/admin/freelancers/{id}/reject
        [HttpPut("freelancers/{id}/reject")]
        public async Task<IActionResult> RejectFreelancer(int id)
        {
            var success = await _freelancerService.RejectFreelancerAsync(id);
            if (!success)
                return NotFound("الصنايعي غير موجود.");

            return Ok(new { Message = "تم رفض الصنايعي." });
        }
    }
}
