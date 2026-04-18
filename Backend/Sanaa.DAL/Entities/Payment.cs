using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Sanaa.DAL.Entities
{
    public enum PaymentStatus
    {
        Pending = 0,
        Succeeded = 1,
        Failed = 2,
        Refunded = 3
    }

    public class Payment
    {
        [Key]
        public int Id { get; set; }

        public int OrderId { get; set; }
        [ForeignKey("OrderId")]
        public virtual Order Order { get; set; }

        [Column(TypeName = "decimal(18,3)")]
        public decimal Amount { get; set; }

        [MaxLength(10)]
        public string Currency { get; set; } = "JOD";

        public PaymentStatus Status { get; set; } = PaymentStatus.Pending;

        [MaxLength(255)]
        public string? StripePaymentIntentId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public virtual Invoice? Invoice { get; set; }
    }
}
