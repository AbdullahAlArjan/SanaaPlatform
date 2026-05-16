namespace Sanaa.BLL.DTOs  
{
    public class CreateOrderRequest
    {
        public int FreelancerID { get; set; }
        public int ServiceID { get; set; }
        public string Description { get; set; }
        public string Location { get; set; }
    }

    public class OrderResponse
    {
        public int OrderID { get; set; }
        public string ClientName { get; set; }
        public string ClientPhone { get; set; }      // User.Phone — used for WhatsApp contact button
        public int FreelancerID { get; set; }
        public string FreelancerName { get; set; }
        public int? ServiceID { get; set; }
        public string ServiceTitle { get; set; }     // Service.Title
        public decimal ServicePriceSnapshot { get; set; } // Order.ServicePriceSnapshot
        public string Description { get; set; }
        public string Location { get; set; }
        public DateTime OrderDate { get; set; }
        public string Status { get; set; }
    }
}