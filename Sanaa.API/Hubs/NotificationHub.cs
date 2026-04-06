using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace Sanaa.API.Hubs
{
    // لازم الكلاس يورث من Hub عشان يمتلك قدرات الـ Real-Time
    public class NotificationHub : Hub
    {
        // هاي الدالة بتتنفذ أول ما يشبك العميل (اختيارية بس حلوة للتتبع)
        public override async Task OnConnectedAsync()
        {
            // ممكن تطبع بالكونسول إنه في حدا شبك
            System.Console.WriteLine($"Client connected: {Context.ConnectionId}");
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(System.Exception? exception)
        {
            System.Console.WriteLine($"Client disconnected: {Context.ConnectionId}");
            await base.OnDisconnectedAsync(exception);
        }
    }
} 