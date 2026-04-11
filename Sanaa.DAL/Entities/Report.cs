using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Sanaa.DAL.Entities
{
    public enum ReportTargetType
    {
        Freelancer = 0,
        Order = 1,
        User = 2
    }

    public enum ReportStatus
    {
        Pending = 0,
        Reviewed = 1,
        Resolved = 2,
        Dismissed = 3
    }

    public class Report
    {
        [Key]
        public int ReportID { get; set; }

        public int ReporterID { get; set; }
        [ForeignKey("ReporterID")]
        public virtual User Reporter { get; set; }

        public ReportTargetType TargetType { get; set; }

        public int TargetID { get; set; }

        [Required]
        [MaxLength(200)]
        public string Reason { get; set; }

        [MaxLength(1000)]
        public string? Description { get; set; }

        public ReportStatus Status { get; set; } = ReportStatus.Pending;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ReviewedAt { get; set; }

        [MaxLength(500)]
        public string? AdminNotes { get; set; }
    }
}
