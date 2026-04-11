using Sanaa.BLL.DTOs;

namespace Sanaa.BLL.Interfaces
{
    public interface IReportService
    {
        Task<bool> SubmitReportAsync(int reporterUserId, SubmitReportRequest request);
        Task<IEnumerable<ReportResponse>> GetAllReportsAsync(string? statusFilter);
        Task<bool> UpdateReportStatusAsync(int reportId, UpdateReportStatusRequest request);
    }
}
