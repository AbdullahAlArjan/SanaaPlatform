using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Sanaa.DAL.Entities
{
    public class Service
    {
        [Key]
        public int ServiceID { get; set; }

        // FK للقسم (nullable عشان الخدمات الموجودة ما تنكسر)
        public int? CategoryID { get; set; }

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

        // علاقة Many-to-One مع القسم
        [ForeignKey("CategoryID")]
        [JsonIgnore] // منع circular reference مع Swagger (Service → Category → Services → ...)
        public virtual Category Category { get; set; }

        // علاقة Many-to-Many مع المستقلين عن طريق الجدول الوسيط
        [JsonIgnore]
        public virtual ICollection<FreelancerService> FreelancerServices { get; set; } = new List<FreelancerService>();
    }
}