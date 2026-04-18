namespace Sanaa.BLL.DTOs
{
    public class UserSearchFilterDto
    {
        // للبحث عن اسم العامل
        public string? SearchTerm { get; set; }

        // للفلترة حسب المدينة (مثلاً: عمان)
        public string? City { get; set; }

        // للفلترة حسب المهنة (مثلاً: نجار)
        public string? Profession { get; set; }
    }
}