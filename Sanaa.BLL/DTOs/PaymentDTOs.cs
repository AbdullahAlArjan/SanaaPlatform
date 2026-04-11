namespace Sanaa.BLL.DTOs
{
    public class CreatePaymentIntentRequest
    {
        public int OrderId { get; set; }
        public decimal Amount { get; set; }
    }

    public class CreatePaymentIntentResponse
    {
        public string ClientSecret { get; set; } = string.Empty;
        public string PaymentIntentId { get; set; } = string.Empty;
        public int PaymentId { get; set; }
    }
}
