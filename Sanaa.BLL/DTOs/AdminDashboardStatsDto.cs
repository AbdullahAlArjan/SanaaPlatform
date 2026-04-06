namespace Sanaa.BLL.DTOs
{
    public class AdminDashboardStatsDto
    {
        public int TotalUsers { get; set; }        // كل الناس اللي بالمنصة
        public int TotalFreelancers { get; set; }  // عدد الصنايعية بس
        public int ActiveUsers { get; set; }       // الحسابات الفعالة (الغير محظورة)
    }
}