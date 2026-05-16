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
        private readonly IUserService       _userService;

        public FreelancersController(IFreelancerService freelancerService, IUserService userService)
        {
            _freelancerService = freelancerService;
            _userService       = userService;
        }

        // ── Onboarding (/api/Freelancers/onboard) ────────────────────────────────
        /// <summary>
        /// Called when a Client taps "Continue as Freelancer".
        /// 1. Promotes User.Role → "Freelancer" in the DB.
        /// 2. Creates a skeleton FreelancerProfile if none exists.
        /// 3. Issues FRESH tokens reflecting the new role — no re-login required.
        /// Idempotent: safe to call multiple times.
        /// </summary>
        [Authorize]   // any authenticated user (Client or Freelancer)
        [HttpPost("onboard")]
        public async Task<IActionResult> Onboard()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            try
            {
                // Step A: promote role + upsert skeleton profile
                await _freelancerService.EnsureProfileExistsAsync(userId.Value);

                // Step B: re-issue tokens so the JWT now carries Role = "Freelancer"
                var tokens = await _userService.GenerateTokensForUserAsync(userId.Value);
                if (tokens is null)
                    return StatusCode(500, new { message = "Token generation failed." });

                return Ok(new
                {
                    message      = "Onboarding complete. Complete your profile to unlock service posting.",
                    code         = "ONBOARDING_OK",
                    accessToken  = tokens.AccessToken,
                    refreshToken = tokens.RefreshToken,
                    role         = tokens.Role   // "Freelancer"
                });
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
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
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
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
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
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

        // GET /api/Freelancers/{userId}/services — public, no auth
        [HttpGet("{userId:int}/services")]
        public async Task<IActionResult> GetUserServices(int userId)
        {
            var services = await _freelancerService.GetUserServicesAsync(userId);
            return Ok(services);
        }

        [HttpGet("{userId}/portfolio")]
        public async Task<IActionResult> GetPortfolio(int userId)
        {
            var images = await _freelancerService.GetPortfolioImagesAsync(userId);
            return Ok(images);
        }

        // ── خدمات الصنايعي الخاصة (/api/Freelancers/my-services) ─────────────

        /// <summary>
        /// Upload one or more images for an existing service.
        /// Appends to any existing images. Max 5 MB per file (enforced by FileUploadService).
        /// </summary>
        [Authorize]
        [HttpPost("my-services/{serviceId:int}/images")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> AddServiceImages(int serviceId)
        {
            var freelancerId = GetCurrentUserId();
            if (freelancerId == null) return Unauthorized();

            var files = Request.Form.Files;
            if (files.Count == 0)
                return BadRequest(new { message = "No files provided.", code = "NO_FILES" });

            try
            {
                var urls = await _freelancerService.AddServiceImagesAsync(
                    freelancerId.Value, serviceId, files);

                if (urls is null)
                    return NotFound(new { message = "Service not found or not owned by you." });

                return Ok(new { imageUrls = urls });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [Authorize]
        [HttpGet("my-services")]
        public async Task<IActionResult> GetMyServices()
        {
            var freelancerId = GetCurrentUserId();
            if (freelancerId == null) return Unauthorized();
            var services = await _freelancerService.GetMyServicesAsync(freelancerId.Value);
            return Ok(services);
        }

        [Authorize]
        [HttpPost("my-services")]
        public async Task<IActionResult> AddMyService([FromBody] CreateServiceRequest request)
        {
            var freelancerId = GetCurrentUserId();
            if (freelancerId == null) return Unauthorized();

            try
            {
                var service = await _freelancerService.AddMyServiceAsync(freelancerId.Value, request);
                if (service is null)
                    return BadRequest(new
                    {
                        message = "Create your freelancer profile first via POST /api/Freelancers/onboard",
                        code    = "NO_PROFILE"
                    });

                return Ok(service);
            }
            catch (InvalidOperationException ex) when (ex.Message == "PROFILE_INCOMPLETE")
            {
                return BadRequest(new
                {
                    message = "Please complete your profile (Bio, Profession, Phone) before posting services.",
                    code    = "PROFILE_INCOMPLETE"
                });
            }
        }

        [Authorize]
        [HttpPut("my-services/{serviceId:int}")]
        public async Task<IActionResult> UpdateMyService(int serviceId, [FromBody] UpdateServiceRequest request)
        {
            var freelancerId = GetCurrentUserId();
            if (freelancerId == null) return Unauthorized();

            var result = await _freelancerService.UpdateMyServiceAsync(freelancerId.Value, serviceId, request);
            if (!result)
                return NotFound(new { message = "الخدمة غير موجودة أو لا تملك صلاحية تعديلها." });

            return Ok(new { message = "تم تحديث الخدمة بنجاح." });
        }

        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(claim, out var id) ? id : null;
        }
    }
}