namespace Sanaa.BLL.DTOs
{
    /// <summary>
    /// Rich service-detail response used by GET /api/Services/{id}.
    /// Includes the owning freelancer's name, avatar, and rating so the
    /// frontend can hydrate the Freelancer Info Card without a second request.
    /// </summary>
    public class ServiceDetailDto
    {
        // ── Service ───────────────────────────────────────────────────────────
        public int      ServiceID   { get; set; }
        public string   Title       { get; set; } = string.Empty;
        public string?  Description { get; set; }
        public decimal  BasePrice   { get; set; }
        public bool     IsActive    { get; set; }
        public DateTime CreatedAt   { get; set; }

        // ── Category ──────────────────────────────────────────────────────────
        public int?    CategoryID   { get; set; }
        public string? CategoryName { get; set; }

        // ── Images ────────────────────────────────────────────────────────────
        /// <summary>Ordered list of uploaded image URLs. Empty list = use category fallback.</summary>
        public List<string> ImageUrls { get; set; } = new();

        // ── Freelancer (first/only owner of the service) ──────────────────────
        public int?    FreelancerID        { get; set; }
        public string? FreelancerName      { get; set; }
        public string? FreelancerAvatarUrl { get; set; }
        public decimal FreelancerRating    { get; set; }
        public string? FreelancerCity      { get; set; }
        public string? FreelancerBio       { get; set; }
    }
}
