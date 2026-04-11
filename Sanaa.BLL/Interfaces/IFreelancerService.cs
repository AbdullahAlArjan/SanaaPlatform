using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sanaa.BLL.DTOs;
namespace Sanaa.BLL.Interfaces
{
    public interface IFreelancerService
    {
        Task<bool> CreateProfileAsync(int userId, string profession, int experienceYears, string city, List<int> serviceIds);
        Task<FreelancerProfileResponse> GetProfileByUserIdAsync(int userId);
        Task<IEnumerable<FreelancerProfileResponse>> SearchFreelancersAsync(string? profession, string? city, int? serviceId);

        Task<string> UploadProfileImageAsync(int freelancerId, IFormFile file);
        Task<List<string>> AddPortfolioImageAsync(int freelancerId, IFormFile file);
        Task<List<string>> RemovePortfolioImageAsync(int freelancerId, string imageUrl);
        Task<List<string>> GetPortfolioImagesAsync(int freelancerId);
    }
}