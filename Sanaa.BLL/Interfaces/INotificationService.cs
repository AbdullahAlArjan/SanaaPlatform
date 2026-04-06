using System.Threading.Tasks;

namespace Sanaa.BLL.Interfaces
{
    public interface INotificationService
    {
        // دالة بتبعث رسالة لمستخدم معين بالـ ID تبعه
        Task SendNotificationToUserAsync(int userId, string message);
    }
}