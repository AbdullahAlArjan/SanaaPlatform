using Sanaa.BLL.DTOs;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Sanaa.BLL.Interfaces
{
    public interface IReviewService
    {
        Task<bool> AddReviewAsync(int clientId, CreateReviewRequest request);
        Task<IEnumerable<ReviewResponseDto>> GetFreelancerReviewsAsync(int freelancerId);
    }
}
