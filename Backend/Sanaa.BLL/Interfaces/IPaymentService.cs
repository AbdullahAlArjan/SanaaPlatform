using Sanaa.BLL.DTOs;

namespace Sanaa.BLL.Interfaces
{
    public interface IPaymentService
    {
        /// <summary>
        /// Creates a Stripe PaymentIntent using the price stored in the DB (ServicePriceSnapshot).
        /// Inserts a Payments row with Status=Pending and returns clientSecret + publishableKey.
        /// </summary>
        Task<CreatePaymentIntentResponse> CreatePaymentIntentAsync(int orderId);

        /// <summary>
        /// Re-verifies the PaymentIntent with Stripe. On "succeeded": marks Payment=Succeeded,
        /// Order=Completed, generates invoice, fires notifications.
        /// </summary>
        Task<bool> ConfirmPaymentAsync(string paymentIntentId);

        /// <summary>
        /// Handles raw Stripe webhook events for server-side reliability.
        /// </summary>
        Task<bool> HandleWebhookAsync(string json, string stripeSignature);
    }
}
