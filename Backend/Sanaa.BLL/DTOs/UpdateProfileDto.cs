using System.ComponentModel.DataAnnotations;

namespace Sanaa.BLL.DTOs
{
    // Used by PUT /api/users/profile — updates basic User table fields
    public class UpdateProfileDto
    {
        [MaxLength(100)]
        public string? FullName { get; set; }

        [MaxLength(20)]
        public string? Phone { get; set; }
    }

    // Used by PUT /api/freelancers/profile — updates FreelancerProfile table fields
    public class UpdateFreelancerProfileDto
    {
        [MaxLength(100)]
        public string? Profession { get; set; }

        [MaxLength(50)]
        public string? City { get; set; }

        [MaxLength(1000)]
        public string? Bio { get; set; }
    }
}
