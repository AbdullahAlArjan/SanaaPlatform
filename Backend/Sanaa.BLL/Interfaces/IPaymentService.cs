using Sanaa.BLL.DTOs;

namespace Sanaa.BLL.Interfaces
{
    public interface IPaymentService
    {
        Task<CreatePaymentIntentResponse> CreatePaymentIntentAsync(int orderId, decimal amount);
        Task<bool> HandleWebhookAsync(string json, string stripeSignature);
    }
}
