using Microsoft.EntityFrameworkCore;
using Sanaa.BLL.DTOs;
using Sanaa.BLL.Interfaces;
using Sanaa.DAL;
using Sanaa.DAL.Entities;

namespace Sanaa.BLL.Services
{
    public class InvoiceService : IInvoiceService
    {
        private readonly SanaaDbContext _context;

        public InvoiceService(SanaaDbContext context)
        {
            _context = context;
        }

        public async Task<InvoiceResponse> GenerateInvoiceAsync(int orderId, int paymentId, decimal amount)
        {
            var count = await _context.Invoices.CountAsync() + 1;
            var invoiceNumber = $"INV-{DateTime.UtcNow.Year}-{count:D5}";

            const decimal taxRate = 0.16m;
            var taxAmount = Math.Round(amount * taxRate, 3);
            var totalAmount = amount + taxAmount;

            var invoice = new Invoice
            {
                OrderID = orderId,
                PaymentID = paymentId,
                InvoiceNumber = invoiceNumber,
                IssueDate = DateTime.UtcNow,
                SubTotal = amount,
                TaxRate = taxRate,
                TaxAmount = taxAmount,
                TotalAmount = totalAmount,
                Status = InvoiceStatus.Paid
            };

            _context.Invoices.Add(invoice);
            await _context.SaveChangesAsync();

            return MapToResponse(invoice);
        }

        public async Task<InvoiceResponse?> GetInvoiceByOrderAsync(int orderId)
        {
            var invoice = await _context.Invoices
                .FirstOrDefaultAsync(i => i.OrderID == orderId);

            return invoice == null ? null : MapToResponse(invoice);
        }

        private static InvoiceResponse MapToResponse(Invoice i) => new()
        {
            InvoiceID = i.InvoiceID,
            OrderID = i.OrderID,
            PaymentID = i.PaymentID,
            InvoiceNumber = i.InvoiceNumber,
            IssueDate = i.IssueDate,
            SubTotal = i.SubTotal,
            TaxRate = i.TaxRate,
            TaxAmount = i.TaxAmount,
            TotalAmount = i.TotalAmount,
            Status = i.Status.ToString(),
            Notes = i.Notes
        };
    }
}
