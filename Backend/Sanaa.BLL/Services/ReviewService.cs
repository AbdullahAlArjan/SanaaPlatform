using Microsoft.EntityFrameworkCore;
using Sanaa.BLL.DTOs;
using Sanaa.BLL.Interfaces;
using Sanaa.DAL;
using Sanaa.DAL.Entities;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Sanaa.BLL.Services
{
    public class ReviewService : IReviewService
    {
        private readonly SanaaDbContext _context;

        public ReviewService(SanaaDbContext context)
        {
            _context = context;
        }

        public async Task<bool> AddReviewAsync(CreateReviewRequest request)
        {
            if (request.Rating < 1 || request.Rating > 5) return false;

            var review = new Review
            {
                OrderID = request.OrderID,
                ClientID = request.ClientID,
                FreelancerID = request.FreelancerID,
                Rating = request.Rating,
                Comment = request.Comment
            };
            _context.Reviews.Add(review);
            await _context.SaveChangesAsync();

            // إعادة حساب متوسط التقييم
            var averageRating = await _context.Reviews
                .Where(r => r.FreelancerID == request.FreelancerID)
                .AverageAsync(r => r.Rating);

            var profile = await _context.FreelancerProfiles.FindAsync(request.FreelancerID);
            if (profile != null)
            {
                profile.AverageRating = (decimal)System.Math.Round(averageRating, 1);
                await _context.SaveChangesAsync();
            }

            return true;
        }

        // جلب تقييمات صنايعي معين (مرتبة بالأحدث)
        public async Task<IEnumerable<ReviewResponseDto>> GetFreelancerReviewsAsync(int freelancerId)
        {
            return await _context.Reviews
                .Where(r => r.FreelancerID == freelancerId)
                .Include(r => r.Client)
                .OrderByDescending(r => r.ReviewDate)
                .Select(r => new ReviewResponseDto
                {
                    ReviewID = r.ReviewID,
                    ClientName = r.Client.FullName,
                    Rating = r.Rating,
                    Comment = r.Comment,
                    ReviewDate = r.ReviewDate
                })
                .ToListAsync();
        }
    }
}
