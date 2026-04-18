using System;

namespace Sanaa.BLL.DTOs
{
    public class CreateReviewRequest
    {
        public int OrderID { get; set; }
        public int ClientID { get; set; }
        public int FreelancerID { get; set; }
        public int Rating { get; set; } // من 1 لـ 5
        public string Comment { get; set; }
    }

    public class ReviewResponseDto
    {
        public int ReviewID { get; set; }
        public string ClientName { get; set; }
        public int Rating { get; set; }
        public string Comment { get; set; }
        public DateTime ReviewDate { get; set; }
    }
}
