using Microsoft.EntityFrameworkCore;
using Sanaa.BLL.DTOs;
using Sanaa.BLL.Interfaces;
using Sanaa.DAL;
using Sanaa.DAL.Entities;
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
            // 1. نتأكد إن التقييم منطقي (بين 1 و 5)
            if (request.Rating < 1 || request.Rating > 5) return false;

            // 2. نضيف التقييم على الداتا بيس
            var review = new Review
            {
                OrderID = request.OrderID,
                ClientID = request.ClientID,
                FreelancerID = request.FreelancerID,
                Rating = request.Rating,
                Comment = request.Comment
            };
            _context.Reviews.Add(review);
            await _context.SaveChangesAsync(); // نحفظ التقييم أولاً

            // 3. السحر: نحسب متوسط التقييم الجديد لهاد العامل
            var averageRating = await _context.Reviews
                .Where(r => r.FreelancerID == request.FreelancerID)
                .AverageAsync(r => r.Rating);

            // 4. نحدث ملف العامل بالرقم الجديد
            var profile = await _context.FreelancerProfiles.FindAsync(request.FreelancerID);
            if (profile != null)
            {
                // بنستخدم Math.Round عشان نخلي الرقم مرتب (مثلاً 4.5 بدل 4.5333)
                profile.AverageRating = (decimal)System.Math.Round(averageRating, 1);
                _context.FreelancerProfiles.Update(profile);
                await _context.SaveChangesAsync(); // نحفظ الملف
            }

            return true;
        }
    }
}