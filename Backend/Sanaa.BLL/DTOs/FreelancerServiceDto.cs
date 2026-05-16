namespace Sanaa.BLL.DTOs
{
    /// <summary>
    /// Full service object returned to a freelancer for their own services.
    /// Used by GET/POST/PUT /api/Freelancers/my-services endpoints.
    /// </summary>
    public class FreelancerServiceDto
    {
        public int     ServiceID   { get; set; }
        public int?    CategoryID  { get; set; }
        public string  Title       { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal BasePrice   { get; set; }
        public bool    IsActive    { get; set; }
        public List<string> ImageUrls { get; set; } = new();
    }
}
