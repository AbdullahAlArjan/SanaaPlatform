using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Sanaa.DAL.Entities
{
    public class Category
    {
        [Key]
        public int CategoryID { get; set; }

        [Required(ErrorMessage = "اسم القسم مطلوب")]
        [MaxLength(100)]
        public string Name { get; set; }

        public string Description { get; set; }

        public string ImageUrl { get; set; }

        // Navigation Property: قسم واحد → خدمات كثيرة (One-to-Many)
        [JsonIgnore] // منع circular reference مع Swagger
        public virtual ICollection<Service> Services { get; set; } = new List<Service>();
    }
}
