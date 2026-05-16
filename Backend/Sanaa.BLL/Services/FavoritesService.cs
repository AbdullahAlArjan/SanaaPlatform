using Microsoft.EntityFrameworkCore;
using Sanaa.BLL.DTOs;
using Sanaa.BLL.Interfaces;
using Sanaa.DAL;
using Sanaa.DAL.Entities;

namespace Sanaa.BLL.Services
{
    public class FavoritesService(SanaaDbContext context) : IFavoritesService
    {
        public async Task<bool> AddAsync(int userId, int serviceId)
        {
            bool alreadyExists = await context.FavoriteServices
                .AnyAsync(f => f.UserID == userId && f.ServiceID == serviceId);

            if (alreadyExists) return false;

            bool serviceExists = await context.Services
                .AnyAsync(s => s.ServiceID == serviceId && s.IsActive);

            if (!serviceExists) return false;

            context.FavoriteServices.Add(new FavoriteService
            {
                UserID    = userId,
                ServiceID = serviceId
            });

            return await context.SaveChangesAsync() > 0;
        }

        public async Task<bool> RemoveAsync(int userId, int serviceId)
        {
            var favorite = await context.FavoriteServices
                .FirstOrDefaultAsync(f => f.UserID == userId && f.ServiceID == serviceId);

            if (favorite is null) return false;

            context.FavoriteServices.Remove(favorite);
            return await context.SaveChangesAsync() > 0;
        }

        public async Task<IEnumerable<FavoriteServiceResponse>> GetAllAsync(int userId)
        {
            return await context.FavoriteServices
                .Where(f => f.UserID == userId)
                .Include(f => f.Service)
                .Select(f => new FavoriteServiceResponse
                {
                    ServiceID   = f.Service.ServiceID,
                    Title       = f.Service.Title,
                    Description = f.Service.Description,
                    BasePrice   = f.Service.BasePrice,
                    SavedAt     = f.SavedAt
                })
                .ToListAsync();
        }
    }
}
