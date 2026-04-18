using Sanaa.BLL.DTOs;
using Sanaa.DAL.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Sanaa.BLL.Interfaces
{
    public interface IUserService
    {
        Task<IEnumerable<User>> GetAllUsersAsync(UserSearchFilterDto filter);
        Task<User> GetUserByIdAsync(int id);
        Task<bool> CreateUserAsync(User user);
        Task<LoginResponse?> LoginAsync(string email, string password);
        Task<LoginResponse?> RefreshTokenAsync(string refreshToken);
        Task<bool> RevokeTokenAsync(string refreshToken);

        Task<AdminDashboardStatsDto> GetSystemStatsAsync();
        Task<bool> ToggleUserStatusAsync(int userId);

        // Soft Delete
        Task<bool> SoftDeleteUserAsync(int userId);
        Task<IEnumerable<User>> GetDeletedUsersAsync();
    }
}
