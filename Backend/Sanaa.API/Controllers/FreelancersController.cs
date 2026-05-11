using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sanaa.API.DTOs;
using Sanaa.BLL.DTOs;
using Sanaa.BLL.Interfaces;
using System.Security.Claims;
using System.Threading.Tasks;


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

        [Authorize]
        [HttpPost("profile")]
        public async Task<IActionResult> CreateProfile([FromBody] CreateProfileRequest request)
        {
            var freelancerId = GetCurrentUserId();
            if (freelancerId == null) return Unauthorized();

            var result = await _freelancerService.CreateProfileAsync(
                freelancerId.Value,
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

        // GET /api/freelancers/profile/me — returns the authenticated freelancer's own profile
        [Authorize]
        [HttpGet("profile/me")]
        public async Task<IActionResult> GetMyProfile()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var profile = await _freelancerService.GetProfileByUserIdAsync(userId.Value);

            if (profile == null)
                return NotFound(new { message = "لم يتم العثور على ملف. أنشئ ملفك أولاً عبر POST /api/freelancers/profile", code = "PROFILE_NOT_FOUND" });

            return Ok(profile);
        }

        // PUT /api/freelancers/profile — updates Profession, City, Bio for the authenticated freelancer
        [Authorize]
        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateFreelancerProfileDto dto)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var updated = await _freelancerService.UpdateProfileAsync(userId.Value, dto);

            if (updated == null)
                return NotFound(new { message = "لم يتم العثور على ملف. أنشئ ملفك أولاً عبر POST /api/freelancers/profile", code = "PROFILE_NOT_FOUND" });

            return Ok(updated);
        }

        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] string? profession, [FromQuery] string? city, [FromQuery] int? serviceId)
        {
            var results = await _freelancerService.SearchFreelancersAsync(profession, city, serviceId);
            // Always return 200 with an empty list — let the frontend handle the empty state
            return Ok(results);
        }

        [Authorize]
        [HttpPost("profile-image")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadProfileImage( IFormFile file)
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
        public async Task<IActionResult> AddPortfolioImage( IFormFile file)
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