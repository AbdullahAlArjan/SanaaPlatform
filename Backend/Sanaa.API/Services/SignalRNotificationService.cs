using Microsoft.AspNetCore.SignalR;
using Sanaa.API.Hubs;
using Sanaa.BLL.Interfaces;
using System.Threading.Tasks;

namespace Sanaa.API.Services
{
    // هاد الكلاس بيطبق العقد تبع الـ BLL، بس بيستخدم أدوات الـ API
    public class SignalRNotificationService : INotificationService
    {
        private readonly IHubContext<NotificationHub> _hubContext;

        public SignalRNotificationService(IHubContext<NotificationHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public async Task SendNotificationToUserAsync(int userId, string message)
        {
            // SignalR ذكي جداً، بيعرف اليوزر من الـ ID اللي حطيناه بالـ JWT Token!
            await _hubContext.Clients.User(userId.ToString()).SendAsync("ReceiveNotification", message);
        }
    }
}