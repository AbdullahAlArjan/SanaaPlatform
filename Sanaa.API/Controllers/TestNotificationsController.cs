using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Sanaa.API.Hubs;
using System.Threading.Tasks;

namespace Sanaa.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TestNotificationsController : ControllerBase
    {
        // الـ IHubContext هو المايكروفون اللي بنستخدمه عشان نبعث رسائل من برا الـ Hub
        private readonly IHubContext<NotificationHub> _hubContext;

        public TestNotificationsController(IHubContext<NotificationHub> hubContext)
        {
            _hubContext = hubContext;
        }

        [HttpPost("send-alert")]
        public async Task<IActionResult> SendAlertToAll(string message)
        {
            // السيرفر بيحكي: "يا كل الناس اللي شابكين، استقبلوا هاي الرسالة على قناة اسمها ReceiveNotification"
            await _hubContext.Clients.All.SendAsync("ReceiveNotification", message);

            return Ok(new { Info = "تم إرسال الإشعار اللحظي بنجاح! 🚀", Message = message });
        }
    }
}