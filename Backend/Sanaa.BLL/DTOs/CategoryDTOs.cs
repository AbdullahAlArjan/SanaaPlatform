using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Sanaa.BLL.DTOs
{
    public class CreateCategoryDto
    {
        [Required(ErrorMessage = "اسم القسم مطلوب")]
        [MaxLength(100)]
        public string Name { get; set; }

        public string Description { get; set; }

        public string ImageUrl { get; set; }
    }

    public class CategoryResponseDto
    {
        public int CategoryID { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string ImageUrl { get; set; }
    }

    public class ServiceSummaryDto
    {
        public int ServiceID { get; set; }
        public string Title { get; set; }
        public decimal BasePrice { get; set; }
    }

    public class CategoryWithServicesDto
    {
        public int CategoryID { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string ImageUrl { get; set; }
        public List<ServiceSummaryDto> Services { get; set; }
    }
}
