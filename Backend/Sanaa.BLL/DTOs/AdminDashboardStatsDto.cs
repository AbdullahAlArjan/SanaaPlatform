using System.Collections.Generic;

namespace Sanaa.BLL.DTOs
{
    public class AdminDashboardStatsDto
    {
        // ── مستخدمون ──────────────────────────────────
        public int TotalUsers { get; set; }
        public int TotalFreelancers { get; set; }
        public int ActiveUsers { get; set; }
        public int PendingFreelancerApprovals { get; set; }

        // ── طلبات ─────────────────────────────────────
        public int TotalOrders { get; set; }
        public int PendingOrders { get; set; }
        public int CompletedOrders { get; set; }

        // ── مالية ─────────────────────────────────────
        public decimal TotalRevenue { get; set; }

        // ── أكثر 5 خدمات طلباً ────────────────────────
        public List<TopServiceDto> TopServices { get; set; } = new();
    }

    public class TopServiceDto
    {
        public string ServiceTitle { get; set; }
        public int OrderCount { get; set; }
    }
}
