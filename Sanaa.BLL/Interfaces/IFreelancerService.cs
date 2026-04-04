using System.Collections.Generic;
using System.Threading.Tasks;
using Sanaa.BLL.DTOs;
namespace Sanaa.BLL.Interfaces
{
    public interface IFreelancerService
    {
        Task<bool> CreateProfileAsync(int userId, string profession, int experienceYears, string city, List<int> serviceIds);
        Task<FreelancerProfileResponse> GetProfileByUserIdAsync(int userId);

        // بنحط علامة الاستفهام (?) عشان نحكي للسي شارب إن هاي الحقول "اختيارية" وممكن العميل ما يبعثها
        Task<IEnumerable<FreelancerProfileResponse>> SearchFreelancersAsync(string? profession, string? city, int? serviceId);
    }
}