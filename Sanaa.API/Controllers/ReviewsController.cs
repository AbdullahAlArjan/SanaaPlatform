using Microsoft.AspNetCore.Mvc;
using Sanaa.BLL.DTOs;
using Sanaa.BLL.Interfaces;
using System.Threading.Tasks;

namespace Sanaa.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReviewsController : ControllerBase
    {
        private readonly IReviewService _reviewService;

        public ReviewsController(IReviewService reviewService)
        {
            _reviewService = reviewService;
        }

        [HttpPost("add")]
        public async Task<IActionResult> AddReview([FromBody] CreateReviewRequest request)
        {
            var result = await _reviewService.AddReviewAsync(request);

            if (result)
                return Ok("تم إضافة التقييم وتحديث حساب الصنايعي بنجاح! ⭐");

            return BadRequest("حدث خطأ. تأكد أن التقييم بين 1 و 5.");
        }
    }
}