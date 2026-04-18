using Sanaa.BLL.DTOs;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Sanaa.BLL.Interfaces
{
    public interface IReviewService
    {
        Task<bool> AddReviewAsync(CreateReviewRequest request);
        Task<IEnumerable<ReviewResponseDto>> GetFreelancerReviewsAsync(int freelancerId);
    }
}
