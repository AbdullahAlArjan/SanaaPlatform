using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Sanaa.DAL.Entities
{
    public class User
    {
        [Key]
        public int UserID { get; set; }

        [Required(ErrorMessage = "الاسم الكامل مطلوب")]
        [MaxLength(100)]
        public string FullName { get; set; }

        [Required]
        [MaxLength(150)]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        [MaxLength(255)]
        public string PasswordHash { get; set; }

        [MaxLength(20)]
        public string Phone { get; set; }

        [Required]
        [MaxLength(20)]
        public string Role { get; set; }

        public DateTime JoinDate { get; set; } = DateTime.Now;

        public bool IsActive { get; set; } = true;

        public bool IsEmailVerified { get; set; } = false;

        public virtual FreelancerProfile? FreelancerProfile { get; set; }
        public virtual ICollection<OtpCode> OtpCodes { get; set; } = new List<OtpCode>();
        public virtual ICollection<Report> Reports { get; set; } = new List<Report>();
    }
}