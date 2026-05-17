using Sanaa.BLL.DTOs;

namespace Sanaa.BLL.Interfaces
{
    public interface IInvoiceService
    {
        Task<InvoiceResponse> GenerateInvoiceAsync(int orderId, int paymentId, decimal amount);
        Task<InvoiceResponse?> GetInvoiceByOrderAsync(int orderId);
    }
}
