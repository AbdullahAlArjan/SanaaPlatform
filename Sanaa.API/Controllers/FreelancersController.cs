using Microsoft.AspNetCore.Mvc;
using Sanaa.API.DTOs;
using Sanaa.BLL.Interfaces;
using System.Threading.Tasks;
using Sanaa.BLL.DTOs;


namespace Sanaa.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FreelancersController : ControllerBase
    {
        private readonly IFreelancerService _freelancerService;

        // حقن الـ Service عشان نقدر نستخدمه
        public FreelancersController(IFreelancerService freelancerService)
        {
            _freelancerService = freelancerService;
        }

        [HttpPost("create-profile")]
        public async Task<IActionResult> CreateProfile([FromBody] CreateProfileRequest request)
        {
            // بنبعث الداتا اللي إجت من الـ DTO للـ Service عشان يعالجها
            var result = await _freelancerService.CreateProfileAsync(
                request.UserID,
                request.Profession,
                request.ExperienceYears,
                request.City,
                request.ServiceIds
            );

            if (result)
                return Ok("تم إنشاء ملف الصنايعي وربطه بالخدمات بنجاح! 🎉");

            return BadRequest("فشلت العملية. (تأكد إن المستخدم موجود، وإن ما عنده ملف من قبل)");
        }

        [HttpGet("{userId}")]
        public async Task<IActionResult> GetProfile(int userId)
        {
            var profile = await _freelancerService.GetProfileByUserIdAsync(userId);

            if (profile == null)
                return NotFound("لم يتم العثور على ملف لهذا المستخدم.");

            return Ok(profile);
        }

        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] string? profession, [FromQuery] string? city, [FromQuery] int? serviceId)
        {
            // بنمرر البيانات اللي إجت من الرابط للـ Service
            var results = await _freelancerService.SearchFreelancersAsync(profession, city, serviceId);

            if (!results.Any())
                return NotFound("لم يتم العثور على صنايعية تطابق عملية البحث.");

            return Ok(results);
        }
    }
}