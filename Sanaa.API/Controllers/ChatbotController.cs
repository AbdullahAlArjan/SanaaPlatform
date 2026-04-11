using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Sanaa.BLL.DTOs;
using Sanaa.BLL.Interfaces;

namespace Sanaa.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ChatbotController : ControllerBase
    {
        private readonly IChatbotService _chatbotService;

        public ChatbotController(IChatbotService chatbotService)
        {
            _chatbotService = chatbotService;
        }

        [EnableRateLimiting("ChatbotPolicy")]
        [HttpPost("message")]
        public async Task<IActionResult> SendMessage([FromBody] ChatbotRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Message))
                return BadRequest("الرسالة لا يمكن أن تكون فارغة");

            var reply = await _chatbotService.GetResponseAsync(
                request.Message, request.ConversationHistory);

            return Ok(new ChatbotResponse { Reply = reply });
        }
    }
}
