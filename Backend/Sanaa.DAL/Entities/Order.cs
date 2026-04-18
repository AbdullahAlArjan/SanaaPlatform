using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Sanaa.DAL.Entities
{
    public class Order
    {
        [Key]
        public int OrderID { get; set; }

        // 1. رقم الزبون اللي طلب الشغل
        public int ClientID { get; set; }
        [ForeignKey("ClientID")]
        public User Client { get; set; }

        // 2. رقم ملف الصنايعي المطلوب
        public int FreelancerID { get; set; }
        [ForeignKey("FreelancerID")]
        public FreelancerProfile Freelancer { get; set; }

        // 3. تفاصيل الطلب
        public string Description { get; set; } // شو المشكلة أو الشغل المطلوب؟
        public string Location { get; set; } // وين المكان؟
        public DateTime OrderDate { get; set; } = DateTime.Now; // تاريخ ووقت الطلب

        // 4. حالة الطلب (الافتراضي: قيد الانتظار)
        public OrderStatus Status { get; set; } = OrderStatus.Pending;

        // 5. حالة الدفع (null = ما صار دفع بعد)
        public PaymentStatus? PaymentStatus { get; set; }

        public virtual Payment? Payment { get; set; }
        public virtual Invoice? Invoice { get; set; }
    }

    // هاد Enum بيسهل علينا التعامل مع حالات الطلب بدل ما نستخدم أرقام مبهمة
    public enum OrderStatus
    {
        Pending = 0,    // قيد الانتظار (العامل لسا ما شافه)
        Accepted = 1,   // مقبول (العامل وافق يجي)
        Rejected = 2,   // مرفوض (العامل اعتذر)
        Completed = 3   // مكتمل (الشغل خلص وتم الدفع)
    }
}