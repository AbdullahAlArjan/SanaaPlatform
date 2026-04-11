using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Sanaa.API.DTOs;
using Sanaa.BLL.DTOs;
using Sanaa.BLL.Interfaces;
using Sanaa.DAL.Entities;

namespace Sanaa.API.Controllers
{
    [Route("api/[controller]")] // العنوان رح يكون api/users
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;

        // بنحقن الـ Service اللي تعبنا عليه جوا الـ Controller
        public UsersController(IUserService userService)
        {
            _userService = userService;
        }

        [Authorize]
        [HttpGet] // طلب جلب بيانات
        [HttpGet]
        [Authorize] // خليها محمية زي ما اتفقنا
        public async Task<IActionResult> GetAllUsers([FromQuery] UserSearchFilterDto filter)
        {
            var users = await _userService.GetAllUsersAsync(filter);

            if (!users.Any())
                return NotFound("لم يتم العثور على عمال بهذه المواصفات.");

            return Ok(users);
        }
        [HttpPost] // طلب إضافة مستخدم
        public async Task<IActionResult> AddUser(User user)
        {
            var result = await _userService.CreateUserAsync(user);
            if (result) return Ok("تمت إضافة المستخدم بنجاح");
            return BadRequest("فشلت عملية الإضافة");
        }

        [EnableRateLimiting("LoginPolicy")]
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var response = await _userService.LoginAsync(request.Email, request.Password);

            if (response == null)
                return Unauthorized("الإيميل أو كلمة المرور غلط");

            if (response.AccessToken == "EMAIL_NOT_VERIFIED")
                return StatusCode(403, "يرجى التحقق من بريدك الإلكتروني أولاً. أرسل رمز التحقق عبر POST /api/auth/send-otp");

            return Ok(response);
        }
    }
}