using Microsoft.AspNetCore.Mvc;
using Sanaa.BLL.Interfaces;
using Sanaa.DAL.Entities;
using Sanaa.API.DTOs;
using Microsoft.AspNetCore.Authorization;

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
        public async Task<IActionResult> GetUsers()
        {
            var users = await _userService.GetAllUsersAsync();
            return Ok(users); // برجع البيانات مع حالة 200 (نجاح)
        }

        [HttpPost] // طلب إضافة مستخدم
        public async Task<IActionResult> AddUser(User user)
        {
            var result = await _userService.CreateUserAsync(user);
            if (result) return Ok("تمت إضافة المستخدم بنجاح");
            return BadRequest("فشلت عملية الإضافة");
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            // هسا النتيجة رح تكون string (التوكن)
            var token = await _userService.LoginAsync(request.Email, request.Password);

            if (token == null)
                return Unauthorized("الإيميل أو كلمة المرور غلط");

            return Ok(new { Token = token });
        }
    }
}