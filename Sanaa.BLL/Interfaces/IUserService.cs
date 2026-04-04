using Sanaa.DAL.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Sanaa.BLL.Interfaces
{
    public interface IUserService
    {
        // هاد العقد بيحكي: أي حدا بدو يشتغل UserService لازم يوفر هاي العمليات
        Task<IEnumerable<User>> GetAllUsersAsync();
        Task<User> GetUserByIdAsync(int id);
        Task<bool> CreateUserAsync(User user);

        Task<string> LoginAsync(string email, string password);
    }
}