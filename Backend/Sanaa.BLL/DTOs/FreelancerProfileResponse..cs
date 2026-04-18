using System.Collections.Generic;

namespace Sanaa.BLL.DTOs
{
    public class FreelancerProfileResponse
    {
        // ── بيانات أساسية ───────────────────────────────
        public int UserID { get; set; }
        public string FullName { get; set; }
        public string Profession { get; set; }
        public int ExperienceYears { get; set; }
        public string City { get; set; }
        public string AvailabilityStatus { get; set; }

        // ── تقييم ────────────────────────────────────────
        public decimal AverageRating { get; set; }

        // ── صور ──────────────────────────────────────────
        public string? ProfileImageUrl { get; set; }
        public List<string>? PortfolioImages { get; set; }

        // ── خدمات ────────────────────────────────────────
        public List<string> Services { get; set; }

        // ── حالة الموافقة ─────────────────────────────────
        public string ApprovalStatus { get; set; }
    }
}
