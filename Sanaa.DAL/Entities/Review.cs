using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Sanaa.DAL.Entities
{
    public class Review
    {
        [Key]
        public int ReviewID { get; set; }

        // التقييم مربوط بطلب معين (عشان نضمن إن الزبون جرب العامل عنجد)
        public int OrderID { get; set; }
        [ForeignKey("OrderID")]
        public Order Order { get; set; }

        // مين الصنايعي اللي تقيّم؟
        public int FreelancerID { get; set; }
        [ForeignKey("FreelancerID")]
        public FreelancerProfile Freelancer { get; set; }

        // مين الزبون اللي قيّم؟
        public int ClientID { get; set; }
        [ForeignKey("ClientID")]
        public User Client { get; set; }

        [Range(1, 5)] // التقييم لازم يكون بين 1 و 5 نجوم
        public int Rating { get; set; }

        public string Comment { get; set; } // رأي الزبون
        public DateTime ReviewDate { get; set; } = DateTime.Now;
    }
}