using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sanaa.BLL.DTOs;

namespace Sanaa.BLL.Interfaces
{
    public interface IFreelancerService
    {
        Task<bool> CreateProfileAsync(int userId, string profession, int experienceYears, string city, List<int> serviceIds);
        /// <summary>
        /// Upsert: updates the user's role to Freelancer and creates a skeleton
        /// FreelancerProfile if one does not already exist. Safe to call multiple times.
        /// </summary>
        Task EnsureProfileExistsAsync(int userId);
        Task<FreelancerProfileResponse?> GetProfileByUserIdAsync(int userId);
        Task<FreelancerProfileResponse?> UpdateProfileAsync(int userId, UpdateFreelancerProfileDto dto);
        Task<IEnumerable<FreelancerProfileResponse>> SearchFreelancersAsync(string? profession, string? city, int? serviceId);

        Task<string> UploadProfileImageAsync(int freelancerId, IFormFile file);
        Task<List<string>> AddPortfolioImageAsync(int freelancerId, IFormFile file);
        Task<List<string>> RemovePortfolioImageAsync(int freelancerId, string imageUrl);
        Task<List<string>> GetPortfolioImagesAsync(int freelancerId);

        // خدمات الصنايعي الخاصة (my-services)
        Task<IEnumerable<FreelancerServiceDto>> GetUserServicesAsync(int userId);
        Task<List<string>?> AddServiceImagesAsync(int freelancerId, int serviceId, IFormFileCollection files);
        Task<FreelancerServiceDto?> AddMyServiceAsync(int freelancerId, CreateServiceRequest request);
        Task<IEnumerable<FreelancerServiceDto>> GetMyServicesAsync(int freelancerId);
        Task<bool> UpdateMyServiceAsync(int freelancerId, int serviceId, UpdateServiceRequest request);

        // إدارة الموافقة (Admin)
        Task<bool> ApproveFreelancerAsync(int freelancerId);
        Task<bool> RejectFreelancerAsync(int freelancerId);
        Task<IEnumerable<FreelancerProfileResponse>> GetPendingFreelancersAsync();
        Task<IEnumerable<FreelancerProfileResponse>> GetAllFreelancerProfilesAsync();
    }
}
