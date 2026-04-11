using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sanaa.BLL.DTOs;
using Sanaa.BLL.Interfaces;
using System.Security.Claims;

namespace Sanaa.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ReportsController : ControllerBase
    {
        private readonly IReportService _reportService;

        public ReportsController(IReportService reportService)
        {
            _reportService = reportService;
        }

        [HttpPost]
        public async Task<IActionResult> SubmitReport([FromBody] SubmitReportRequest request)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();

            var reporterUserId = int.Parse(userIdClaim);
            var result = await _reportService.SubmitReportAsync(reporterUserId, request);

            if (!result) return BadRequest("فشل رفع البلاغ. قد تكون رفعت بلاغاً مسبقاً على نفس الهدف.");

            return Ok("تم رفع البلاغ بنجاح وسيتم مراجعته");
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllReports([FromQuery] string? status, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            var reports = await _reportService.GetAllReportsAsync(status, pageNumber, pageSize);
            return Ok(reports);
        }

        [HttpPut("{id}/status")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateReportStatus(int id, [FromBody] UpdateReportStatusRequest request)
        {
            var result = await _reportService.UpdateReportStatusAsync(id, request);
            if (!result) return NotFound("البلاغ غير موجود أو الحالة غير صحيحة");

            return Ok("تم تحديث حالة البلاغ");
        }
    }
}
