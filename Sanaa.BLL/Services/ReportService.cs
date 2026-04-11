using Microsoft.EntityFrameworkCore;
using Sanaa.BLL.DTOs;
using Sanaa.BLL.Interfaces;
using Sanaa.DAL;
using Sanaa.DAL.Entities;

namespace Sanaa.BLL.Services
{
    public class ReportService : IReportService
    {
        private readonly SanaaDbContext _context;

        public ReportService(SanaaDbContext context)
        {
            _context = context;
        }

        public async Task<bool> SubmitReportAsync(int reporterUserId, SubmitReportRequest request)
        {
            if (!Enum.TryParse<ReportTargetType>(request.TargetType, out var targetType))
                return false;

            // منع بلاغين من نفس المستخدم على نفس الـ target
            var duplicate = await _context.Reports.AnyAsync(r =>
                r.ReporterID == reporterUserId &&
                r.TargetType == targetType &&
                r.TargetID == request.TargetID);

            if (duplicate) return false;

            _context.Reports.Add(new Report
            {
                ReporterID = reporterUserId,
                TargetType = targetType,
                TargetID = request.TargetID,
                Reason = request.Reason,
                Description = request.Description,
                Status = ReportStatus.Pending,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<ReportResponse>> GetAllReportsAsync(string? statusFilter)
        {
            var query = _context.Reports
                .Include(r => r.Reporter)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(statusFilter) &&
                Enum.TryParse<ReportStatus>(statusFilter, out var status))
            {
                query = query.Where(r => r.Status == status);
            }

            var reports = await query.OrderByDescending(r => r.CreatedAt).ToListAsync();

            return reports.Select(r => new ReportResponse
            {
                ReportID = r.ReportID,
                ReporterID = r.ReporterID,
                ReporterName = r.Reporter.FullName,
                TargetType = r.TargetType.ToString(),
                TargetID = r.TargetID,
                Reason = r.Reason,
                Description = r.Description,
                Status = r.Status.ToString(),
                CreatedAt = r.CreatedAt,
                AdminNotes = r.AdminNotes
            });
        }

        public async Task<bool> UpdateReportStatusAsync(int reportId, UpdateReportStatusRequest request)
        {
            if (!Enum.TryParse<ReportStatus>(request.Status, out var status))
                return false;

            var report = await _context.Reports.FindAsync(reportId);
            if (report == null) return false;

            report.Status = status;
            report.ReviewedAt = DateTime.UtcNow;
            report.AdminNotes = request.AdminNotes;

            await _context.SaveChangesAsync();
            return true;
        }
    }
}
