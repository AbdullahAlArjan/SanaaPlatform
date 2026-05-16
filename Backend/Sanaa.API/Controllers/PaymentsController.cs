using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sanaa.BLL.DTOs;
using Sanaa.BLL.Interfaces;

namespace Sanaa.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PaymentsController : ControllerBase
    {
        private readonly IPaymentService _paymentService;

        public PaymentsController(IPaymentService paymentService)
        {
            _paymentService = paymentService;
        }

        /// <summary>
        /// Step 1 of checkout: create a Stripe PaymentIntent and a pending Payments row.
        /// Amount is read from the DB — the client only provides the OrderId.
        /// </summary>
        [Authorize]
        [HttpPost("create-intent")]
        public async Task<IActionResult> CreatePaymentIntent([FromBody] CreatePaymentIntentRequest request)
        {
            try
            {
                var result = await _paymentService.CreatePaymentIntentAsync(request.OrderId);
                return Ok(result);
            }
            catch (ArgumentException ex)      { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        /// <summary>
        /// Step 2 of checkout: called by the frontend after stripe.confirmPayment() succeeds.
        /// Re-verifies the PaymentIntent status directly with Stripe before updating the DB.
        /// </summary>
        [Authorize]
        [HttpPost("confirm")]
        public async Task<IActionResult> ConfirmPayment([FromBody] ConfirmPaymentRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.PaymentIntentId))
                return BadRequest(new { message = "PaymentIntentId is required." });

            var succeeded = await _paymentService.ConfirmPaymentAsync(request.PaymentIntentId);

            return succeeded
                ? Ok(new { message = "Payment confirmed. Order is now complete." })
                : BadRequest(new { message = "Payment not yet succeeded or intent not found." });
        }

        /// <summary>
        /// Stripe webhook receiver — must be public (no auth) so Stripe can call it.
        /// Raw body is required for signature verification.
        /// </summary>
        [AllowAnonymous]
        [HttpPost("webhook")]
        public async Task<IActionResult> WebhookReceiver()
        {
            var json      = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync();
            var signature = Request.Headers["Stripe-Signature"].ToString();

            var result = await _paymentService.HandleWebhookAsync(json, signature);
            if (!result) return BadRequest("Webhook signature verification failed.");

            return Ok();
        }
    }
}
