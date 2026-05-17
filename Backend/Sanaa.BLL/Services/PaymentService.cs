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
        private readonly IEmailService _emailService;

        public PaymentService(
            SanaaDbContext context,
            IConfiguration configuration,
            INotificationService notificationService,
            IEmailService emailService)
        {
            _context = context;
            _configuration = configuration;
            _notificationService = notificationService;
            _emailService = emailService;
            StripeConfiguration.ApiKey = _configuration["Stripe:SecretKey"];
        }

        // ── CreatePaymentIntentAsync ──────────────────────────────────────────────
        // Price is always read from ServicePriceSnapshot in the DB — the client
        // never sends an amount, so the price cannot be tampered with.
        public async Task<CreatePaymentIntentResponse> CreatePaymentIntentAsync(int orderId)
        {
            var order = await _context.Orders
                .Include(o => o.Service)
                .FirstOrDefaultAsync(o => o.OrderID == orderId)
                ?? throw new ArgumentException("Order not found.");

            // Prefer the snapshot captured at order-creation time; fall back to live service price
            var amount = order.ServicePriceSnapshot ?? order.Service?.BasePrice
                ?? throw new InvalidOperationException("Cannot determine order price.");

            // USD: amount in cents  (× 100). Switch to "jod" + × 1000 if currency changes.
            var amountInCents = (long)(amount * 100);

            var intentOptions = new PaymentIntentCreateOptions
            {
                Amount   = amountInCents,
                Currency = "usd",
                Metadata = new Dictionary<string, string>
                {
                    { "orderId",  orderId.ToString() },
                    { "clientId", order.ClientID.ToString() }
                },
                // Recommended for Payment Element: automatic payment methods
                AutomaticPaymentMethods = new PaymentIntentAutomaticPaymentMethodsOptions
                {
                    Enabled = true
                }
            };

            var intentService = new PaymentIntentService();
            var intent        = await intentService.CreateAsync(intentOptions);

            var payment = new Payment
            {
                OrderId               = orderId,
                Amount                = amount,
                Currency              = "USD",
                Status                = PaymentStatus.Pending,
                StripePaymentIntentId = intent.Id,
                CreatedAt             = DateTime.UtcNow
            };

            _context.Payments.Add(payment);
            await _context.SaveChangesAsync();

            return new CreatePaymentIntentResponse
            {
                ClientSecret    = intent.ClientSecret,
                PaymentIntentId = intent.Id,
                PaymentId       = payment.Id,
                PublishableKey  = _configuration["Stripe:PublishableKey"] ?? string.Empty,
                Amount          = amount,
                Currency        = "USD"
            };
        }

        // ── ConfirmPaymentAsync ───────────────────────────────────────────────────
        // Called by the frontend after stripe.confirmPayment() resolves on the client.
        // We re-verify the status directly with Stripe — never trust the client claim alone.
        public async Task<bool> ConfirmPaymentAsync(string paymentIntentId)
        {
            // Re-fetch the intent from Stripe to verify its current status
            var intentService = new PaymentIntentService();
            PaymentIntent intent;
            try
            {
                intent = await intentService.GetAsync(paymentIntentId);
            }
            catch (StripeException)
            {
                return false;
            }

            if (intent.Status != "succeeded")
                return false;

            // Run the same post-payment logic as the webhook handler
            return await _FinaliseSucceededPaymentAsync(paymentIntentId);
        }

        // ── HandleWebhookAsync ────────────────────────────────────────────────────
        // Server-side reliability: Stripe retries the webhook if your endpoint fails,
        // so payment completion is guaranteed even if the browser was closed.
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
                await _FinaliseSucceededPaymentAsync(intent.Id);
            }

            return true;
        }

        // ── Shared post-payment logic ─────────────────────────────────────────────
        // Called by both ConfirmPaymentAsync and the webhook handler so the DB updates,
        // invoice generation and notifications are never duplicated.
        private async Task<bool> _FinaliseSucceededPaymentAsync(string paymentIntentId)
        {
            var payment = await _context.Payments
                .Include(p => p.Order)
                .FirstOrDefaultAsync(p => p.StripePaymentIntentId == paymentIntentId);

            if (payment == null) return false;

            // Idempotency guard: already finalised by a previous call (webhook or confirm)
            if (payment.Status == PaymentStatus.Succeeded) return true;

            payment.Status            = PaymentStatus.Succeeded;
            payment.Order.Status      = OrderStatus.Completed;
            payment.Order.PaymentStatus = PaymentStatus.Succeeded;
            await _context.SaveChangesAsync();

            // SignalR notification to the freelancer
            await _notificationService.SendNotificationToUserAsync(
                payment.Order.FreelancerID,
                $"تم استلام الدفعة للطلب رقم {payment.OrderId} — المبلغ: {payment.Amount} USD");

            // Confirmation emails (fire-and-forget so they don't block the response)
            _ = Task.Run(async () =>
            {
                try
                {
                    var clientUser     = await _context.Users.FindAsync(payment.Order.ClientID);
                    var freelancerUser = await _context.Users.FindAsync(payment.Order.FreelancerID);

                    Func<string, string> body = name =>
                        $"<div dir='rtl'><h3>مرحباً {name}</h3>" +
                        $"<p>تم تأكيد الدفعة للطلب رقم <strong>{payment.OrderId}</strong>.</p>" +
                        $"<p>المبلغ: <strong>{payment.Amount} USD</strong></p>" +
                        $"<p>شكراً لاستخدامك منصة صناع.</p></div>";

                    if (clientUser != null)
                        await _emailService.SendAsync(clientUser.Email, clientUser.FullName,
                            "تأكيد الدفع — منصة صناع", body(clientUser.FullName));

                    if (freelancerUser != null)
                        await _emailService.SendAsync(freelancerUser.Email, freelancerUser.FullName,
                            "تأكيد استلام الدفع — منصة صناع", body(freelancerUser.FullName));
                }
                catch { /* non-fatal */ }
            });

            return true;
        }
    }
}
