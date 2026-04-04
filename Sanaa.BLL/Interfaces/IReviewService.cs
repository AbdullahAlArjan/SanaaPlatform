using Sanaa.BLL.DTOs;
using System.Threading.Tasks;

namespace Sanaa.BLL.Interfaces
{
    public interface IReviewService
    {
        Task<bool> AddReviewAsync(CreateReviewRequest request);
    }
}