using Sanaa.BLL.DTOs;

namespace Sanaa.BLL.Interfaces
{
    public interface IFavoritesService
    {
        Task<bool>                              AddAsync   (int userId, int serviceId);
        Task<bool>                              RemoveAsync(int userId, int serviceId);
        Task<IEnumerable<FavoriteServiceResponse>> GetAllAsync(int userId);
    }
}
