using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sanaa.API.DTOs;
using Sanaa.BLL.Interfaces;
using System.Security.Claims;
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
            var results = await _freelancerService.SearchFreelancersAsync(profession, city, serviceId);

            if (!results.Any())
                return NotFound("لم يتم العثور على صنايعية تطابق عملية البحث.");

            return Ok(results);
        }

        [Authorize]
        [HttpPost("profile-image")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadProfileImage([FromForm] IFormFile file)
        {
            var freelancerId = GetCurrentUserId();
            if (freelancerId == null) return Unauthorized();

            try
            {
                var url = await _freelancerService.UploadProfileImageAsync(freelancerId.Value, file);
                return Ok(new { ImageUrl = url });
            }
            catch (ArgumentException ex) { return BadRequest(ex.Message); }
        }

        [Authorize]
        [HttpPost("portfolio")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> AddPortfolioImage([FromForm] IFormFile file)
        {
            var freelancerId = GetCurrentUserId();
            if (freelancerId == null) return Unauthorized();

            try
            {
                var images = await _freelancerService.AddPortfolioImageAsync(freelancerId.Value, file);
                return Ok(images);
            }
            catch (ArgumentException ex) { return BadRequest(ex.Message); }
            catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
        }

        [Authorize]
        [HttpDelete("portfolio")]
        public async Task<IActionResult> RemovePortfolioImage([FromQuery] string imageUrl)
        {
            var freelancerId = GetCurrentUserId();
            if (freelancerId == null) return Unauthorized();

            try
            {
                var images = await _freelancerService.RemovePortfolioImageAsync(freelancerId.Value, imageUrl);
                return Ok(images);
            }
            catch (ArgumentException ex) { return BadRequest(ex.Message); }
        }

        [HttpGet("{userId}/portfolio")]
        public async Task<IActionResult> GetPortfolio(int userId)
        {
            var images = await _freelancerService.GetPortfolioImagesAsync(userId);
            return Ok(images);
        }

        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(claim, out var id) ? id : null;
        }
    }
}