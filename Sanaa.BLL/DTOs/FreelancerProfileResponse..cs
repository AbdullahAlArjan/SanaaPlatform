using System.Collections.Generic;

namespace Sanaa.BLL.DTOs // 👈 لاحظ النيم سبيس صار تابع للـ BLL
{
    public class FreelancerProfileResponse
    {
        public int UserID { get; set; }
        public string Profession { get; set; }
        public int ExperienceYears { get; set; }
        public string City { get; set; }
        public decimal AverageRating { get; set; }
        public List<string> Services { get; set; }
    }
}