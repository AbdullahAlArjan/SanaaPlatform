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

        [Authorize]
        [HttpPost("create-intent")]
        public async Task<IActionResult> CreatePaymentIntent([FromBody] CreatePaymentIntentRequest request)
        {
            try
            {
                var result = await _paymentService.CreatePaymentIntentAsync(request.OrderId, request.Amount);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
        }

        // Stripe يستدعي هاد الـ endpoint مباشرة — لازم يكون public بدون Auth
        [AllowAnonymous]
        [HttpPost("webhook")]
        public async Task<IActionResult> WebhookReceiver()
        {
            // لازم نقرأ الـ raw body عشان Stripe يتحقق من الـ signature
            var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync();
            var signature = Request.Headers["Stripe-Signature"].ToString();

            var result = await _paymentService.HandleWebhookAsync(json, signature);
            if (!result) return BadRequest("Webhook signature verification failed");

            return Ok();
        }
    }
}
