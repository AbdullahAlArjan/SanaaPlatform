using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Sanaa.DAL.Entities
{
    public enum InvoiceStatus
    {
        Draft = 0,
        Sent = 1,
        Paid = 2,
        Cancelled = 3
    }

    public class Invoice
    {
        [Key]
        public int InvoiceID { get; set; }

        public int OrderID { get; set; }
        [ForeignKey("OrderID")]
        public virtual Order Order { get; set; }

        public int PaymentID { get; set; }
        [ForeignKey("PaymentID")]
        public virtual Payment Payment { get; set; }

        [Required]
        [MaxLength(20)]
        public string InvoiceNumber { get; set; }

        public DateTime IssueDate { get; set; } = DateTime.UtcNow;

        [Column(TypeName = "decimal(18,3)")]
        public decimal SubTotal { get; set; }

        [Column(TypeName = "decimal(5,4)")]
        public decimal TaxRate { get; set; } = 0.16m;

        [Column(TypeName = "decimal(18,3)")]
        public decimal TaxAmount { get; set; }

        [Column(TypeName = "decimal(18,3)")]
        public decimal TotalAmount { get; set; }

        public InvoiceStatus Status { get; set; } = InvoiceStatus.Paid;

        [MaxLength(500)]
        public string? Notes { get; set; }
    }
}
