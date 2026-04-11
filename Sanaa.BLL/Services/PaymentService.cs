using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Sanaa.BLL.DTOs;
using Sanaa.BLL.Interfaces;
using Sanaa.DAL;
using Sanaa.DAL.Entities;
using Stripe;

namespace Sanaa.BLL.Services
{
    public class PaymentService : IPaymentService
    {
        private readonly SanaaDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly INotificationService _notificationService;
        private readonly IInvoiceService _invoiceService;

        public PaymentService(
            SanaaDbContext context,
            IConfiguration configuration,
            INotificationService notificationService,
            IInvoiceService invoiceService)
        {
            _context = context;
            _configuration = configuration;
            _notificationService = notificationService;
            _invoiceService = invoiceService;
            StripeConfiguration.ApiKey = _configuration["Stripe:SecretKey"];
        }

        public async Task<CreatePaymentIntentResponse> CreatePaymentIntentAsync(int orderId, decimal amount)
        {
            var order = await _context.Orders.FindAsync(orderId);
            if (order == null)
                throw new ArgumentException("الطلب غير موجود");

            // JOD: 1 دينار = 1000 فلس (أصغر وحدة عملة في Stripe)
            var amountInFils = (long)(amount * 1000);

            var options = new PaymentIntentCreateOptions
            {
                Amount = amountInFils,
                Currency = "jod",
                Metadata = new Dictionary<string, string>
                {
                    { "orderId", orderId.ToString() }
                }
            };

            var service = new PaymentIntentService();
            var intent = await service.CreateAsync(options);

            var payment = new Payment
            {
                OrderId = orderId,
                Amount = amount,
                Currency = "JOD",
                Status = PaymentStatus.Pending,
                StripePaymentIntentId = intent.Id,
                CreatedAt = DateTime.UtcNow
            };

            _context.Payments.Add(payment);
            await _context.SaveChangesAsync();

            return new CreatePaymentIntentResponse
            {
                ClientSecret = intent.ClientSecret,
                PaymentIntentId = intent.Id,
                PaymentId = payment.Id
            };
        }

        public async Task<bool> HandleWebhookAsync(string json, string stripeSignature)
        {
            var webhookSecret = _configuration["Stripe:WebhookSecret"];

            Event stripeEvent;
            try
            {
                stripeEvent = EventUtility.ConstructEvent(json, stripeSignature, webhookSecret);
            }
            catch (StripeException)
            {
                return false;
            }

            if (stripeEvent.Type == "payment_intent.succeeded")
            {
                var intent = stripeEvent.Data.Object as PaymentIntent;
                if (intent == null) return false;

                var payment = await _context.Payments
                    .Include(p => p.Order)
                    .FirstOrDefaultAsync(p => p.StripePaymentIntentId == intent.Id);

                if (payment == null) return false;

                payment.Status = PaymentStatus.Succeeded;
                payment.Order.PaymentStatus = PaymentStatus.Succeeded;
                await _context.SaveChangesAsync();

                // إنشاء الفاتورة تلقائياً
                await _invoiceService.GenerateInvoiceAsync(
                    payment.OrderId, payment.Id, payment.Amount);

                // إشعار الصنايعي
                await _notificationService.SendNotificationToUserAsync(
                    payment.Order.FreelancerID,
                    $"تم استلام الدفعة بنجاح للطلب رقم {payment.OrderId} - قيمة: {payment.Amount} JOD");
            }

            return true;
        }
    }
}
