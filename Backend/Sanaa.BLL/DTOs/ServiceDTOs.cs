namespace Sanaa.BLL.DTOs
{
    public class CreateServiceRequest
    {
        public int? CategoryID { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public decimal BasePrice { get; set; }
    }

    public class UpdateServiceRequest
    {
        public int? CategoryID { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public decimal BasePrice { get; set; }
        public bool IsActive { get; set; }
    }
}
