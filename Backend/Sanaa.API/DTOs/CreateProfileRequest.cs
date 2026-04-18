using System.Collections.Generic;

namespace Sanaa.API.DTOs
{
    public class CreateProfileRequest
    {
        public int UserID { get; set; }
        public string Profession { get; set; } // المهنة (بدل Bio)
        public int ExperienceYears { get; set; } // سنوات الخبرة (بدل HourlyRate)
        public string City { get; set; } // المدينة
        public List<int> ServiceIds { get; set; }
    }
}