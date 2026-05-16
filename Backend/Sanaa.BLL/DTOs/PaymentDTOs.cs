namespace Sanaa.BLL.DTOs
{
    /// <summary>
    /// Frontend sends only the OrderId — amount is always fetched from the DB
    /// so the client can never manipulate the price.
    /// </summary>
    public class CreatePaymentIntentRequest
    {
        public int OrderId { get; set; }
    }

    /// <summary>
    /// Returned to the frontend after creating a Stripe PaymentIntent.
    /// PublishableKey is included so the JS never needs to hardcode it.
    /// </summary>
    public class CreatePaymentIntentResponse
    {
        public string ClientSecret    { get; set; } = string.Empty;
        public string PaymentIntentId { get; set; } = string.Empty;
        public int    PaymentId       { get; set; }
        public string PublishableKey  { get; set; } = string.Empty;
        public decimal Amount         { get; set; }   // echoed back for the UI summary
        public string Currency        { get; set; } = "usd";
    }

    /// <summary>
    /// Sent by the frontend after stripe.confirmPayment() succeeds client-side.
    /// Backend re-verifies the intent status directly with Stripe before updating the DB.
    /// </summary>
    public class ConfirmPaymentRequest
    {
        public string PaymentIntentId { get; set; } = string.Empty;
    }
}
