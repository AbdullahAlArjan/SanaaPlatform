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
        /// <summary>
        /// Issues a fresh JWT + refresh-token pair for an existing user,
        /// reflecting the user's current role in the database.
        /// Used by the Freelancer onboard endpoint after role promotion.
        /// </summary>
        Task<LoginResponse?> GenerateTokensForUserAsync(int userId);

        // Soft Delete
        Task<bool> SoftDeleteUserAsync(int userId);
        Task<IEnumerable<User>> GetDeletedUsersAsync();
    }
}
