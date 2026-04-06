using Sanaa.BLL.DTOs;
using Sanaa.DAL.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Sanaa.BLL.Interfaces
{
    public interface IUserService
    {
        // مسحنا السطر القديم من هون وخلينا بس السطر الجديد اللي فيه الفلتر
        Task<IEnumerable<User>> GetAllUsersAsync(UserSearchFilterDto filter);
        Task<User> GetUserByIdAsync(int id);
        Task<bool> CreateUserAsync(User user);
        Task<string> LoginAsync(string email, string password);

        Task<AdminDashboardStatsDto> GetSystemStatsAsync();
        Task<bool> ToggleUserStatusAsync(int userId);
    }
}