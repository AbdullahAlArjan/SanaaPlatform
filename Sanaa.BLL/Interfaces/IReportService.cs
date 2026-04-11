using Sanaa.BLL.DTOs;

namespace Sanaa.BLL.Interfaces
{
    public interface IReportService
    {
        Task<bool> SubmitReportAsync(int reporterUserId, SubmitReportRequest request);
        Task<PagedResponse<ReportResponse>> GetAllReportsAsync(string? statusFilter, int pageNumber, int pageSize);
        Task<bool> UpdateReportStatusAsync(int reportId, UpdateReportStatusRequest request);
    }
}
