namespace Sanaa.BLL.DTOs  
{
    public class CreateOrderRequest
    {
        public int ClientID { get; set; }
        public int FreelancerID { get; set; }
        public string Description { get; set; }
        public string Location { get; set; }
    }

    public class OrderResponse
    {
        public int OrderID { get; set; }
        public string ClientName { get; set; }
        public string Description { get; set; }
        public string Location { get; set; }
        public DateTime OrderDate { get; set; }
        public string Status { get; set; }
    }
}