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
        public int FreelancerID { get; set; }       // FreelancerProfile.FreelancerID — needed for report link
        public string FreelancerName { get; set; }
        public int? ServiceID { get; set; }          // Order.ServiceID — needed for report link
        public string Description { get; set; }
        public string Location { get; set; }
        public DateTime OrderDate { get; set; }
        public string Status { get; set; }
    }
}