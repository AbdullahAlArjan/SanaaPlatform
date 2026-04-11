namespace Sanaa.BLL.DTOs
{
    public class SubmitReportRequest
    {
        public string TargetType { get; set; } = string.Empty;
        public int TargetID { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string? Description { get; set; }
    }

    public class ReportResponse
    {
        public int ReportID { get; set; }
        public int ReporterID { get; set; }
        public string ReporterName { get; set; } = string.Empty;
        public string TargetType { get; set; } = string.Empty;
        public int TargetID { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string? AdminNotes { get; set; }
    }

    public class UpdateReportStatusRequest
    {
        public string Status { get; set; } = string.Empty;
        public string? AdminNotes { get; set; }
    }
}
