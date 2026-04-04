using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic;

namespace Sanaa.DAL.Entities
{
    public class FreelancerProfile
    {
        // بنحدد إنه هاد الحقل هو الـ Primary Key وبنفس الوقت Foreign Key بيأشر على جدول User
        [Key]
        [ForeignKey("User")]
        public int FreelancerID { get; set; }

        [Required(ErrorMessage = "التخصص مطلوب")]
        [MaxLength(100)]
        public string Profession { get; set; }

        public int ExperienceYears { get; set; }

        [MaxLength(50)]
        public string City { get; set; }

        [MaxLength(20)]
        public string AvailabilityStatus { get; set; } = "Available";

        // عشان نحدد للـ SQL إنه هاد الرقم العشري بيوسع 3 خانات، ثنتين منهم بعد الفاصلة (زي 4.75)
        [Column(TypeName = "decimal(3,2)")]
        public decimal AverageRating { get; set; } = 0;


        // ⬇️ Navigation Properties (العلاقات) ⬇️

        // 1. علاقة 1 لـ 1 مع جدول الـ User (عشان نربط البروفايل بصاحبه)
        public virtual User User { get; set; }

        // 2. علاقة Many-to-Many مع جدول الخدمات (Service) عن طريق جدول الوسيط (FreelancerService)
        // (ممكن تطلعلك خطوط حمراء تحت FreelancerService لأننا لسه ما عملناه، وهاد طبيعي جداً)
        public virtual ICollection<FreelancerService> FreelancerServices { get; set; } = new List<FreelancerService>();
    }
}