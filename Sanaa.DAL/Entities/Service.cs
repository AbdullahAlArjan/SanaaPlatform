using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Sanaa.DAL.Entities
{
    public class Service
    {
        [Key]
        public int ServiceID { get; set; }

        // رح نضيف الـ CategoryID بعدين بس نعمل جدول الأقسام، عشان نمشي حبة حبة

        [Required(ErrorMessage = "عنوان الخدمة مطلوب")]
        [MaxLength(100)]
        public string Title { get; set; }

        public string Description { get; set; }

        // TypeName = "money" عشان تتخزن في SQL Server بصيغة مصاري بدل رقم عشري عادي
        [Column(TypeName = "money")]
        public decimal BasePrice { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public bool IsActive { get; set; } = true;

        // ⬇️ Navigation Properties ⬇️

        // علاقة Many-to-Many مع المستقلين عن طريق الجدول الوسيط
        public virtual ICollection<FreelancerService> FreelancerServices { get; set; } = new List<FreelancerService>();
    }
}