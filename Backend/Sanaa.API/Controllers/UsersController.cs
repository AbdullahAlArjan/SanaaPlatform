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
        [HttpGet]
        public async Task<IActionResult> GetAllUsers([FromQuery] UserSearchFilterDto filter)
        {
            var users = await _userService.GetAllUsersAsync(filter);

            if (!users.Any())
                return NotFound("لم يتم العثور على عمال بهذه المواصفات.");

            return Ok(users);
        }
    }
}