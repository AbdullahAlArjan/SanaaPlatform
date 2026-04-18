using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Sanaa.DAL.Entities
{
    public class FreelancerService
    {
        // ⚠️ ملاحظة هندسية مهمة: 
        // هاد الجدول ماله Primary Key عادي (زي ID). المفتاح تبعه "مركب" (Composite Key) 
        // بيتكون من (FreelancerID + ServiceID) مع بعض.
        // بالـ EF Core، أحسن طريقة لنعرف المفتاح المركب هي من خلال الـ DbContext (رح نعملها بالخطوة الجاي).

        [ForeignKey("FreelancerProfile")]
        public int FreelancerID { get; set; }
        public virtual FreelancerProfile FreelancerProfile { get; set; }

        [ForeignKey("Service")]
        public int ServiceID { get; set; }
        public virtual Service Service { get; set; }

        // السعر المخصص للعامل (ممكن يكون Null، وإذا كان Null بناخذ الـ BasePrice من جدول الخدمة)
        [Column(TypeName = "money")]
        public decimal? CustomPrice { get; set; }

        public bool IsAvailable { get; set; } = true;
    }
}