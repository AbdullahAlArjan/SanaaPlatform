using Sanaa.BLL.DTOs;

namespace Sanaa.BLL.Interfaces
{
    public interface IReportService
    {
        /// <summary>
        /// Returns null on success, or an error code string:
        ///   "INVALID_TARGET"  — TargetType string is not a valid enum value
        ///   "NO_PAID_ORDER"   — reporter has no Completed order with this freelancer
        ///   "DUPLICATE"       — reporter already filed a report against this target
        /// </summary>
        Task<string?> SubmitReportAsync(int reporterUserId, SubmitReportRequest request);
        Task<PagedResponse<ReportResponse>> GetAllReportsAsync(string? statusFilter, int pageNumber, int pageSize);
        Task<bool> UpdateReportStatusAsync(int reportId, UpdateReportStatusRequest request);
    }
}
