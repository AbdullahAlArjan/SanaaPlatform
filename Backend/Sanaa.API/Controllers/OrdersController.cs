using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Sanaa.BLL.DTOs;
using Sanaa.BLL.Interfaces;
using Sanaa.DAL.Entities;
using System.Threading.Tasks;

namespace Sanaa.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OrdersController : ControllerBase
    {
        private readonly IOrderService _orderService;

        public OrdersController(IOrderService orderService)
        {
            _orderService = orderService;
        }

        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(claim, out var id) ? id : null;
        }

        [Authorize]
        [HttpPost]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request)
        {
            var clientId = GetCurrentUserId();
            if (clientId == null) return Unauthorized();

            var orderId = await _orderService.CreateOrderAsync(clientId.Value, request);
            if (orderId == null) return BadRequest(new { message = "حدث خطأ أثناء إرسال الطلب." });

            // Shallow projection — avoids circular-reference crashes from EF navigation properties.
            // Frontend reads: orderRes.orderId
            return Ok(new { orderId = orderId.Value });
        }

        [Authorize]
        [HttpGet("my-orders")]
        public async Task<IActionResult> GetMyOrders([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            var clientId = GetCurrentUserId();
            if (clientId == null) return Unauthorized();

            var orders = await _orderService.GetOrdersForClientAsync(clientId.Value, pageNumber, pageSize);
            return Ok(orders);
        }

        [Authorize]
        [HttpGet("freelancer")]
        public async Task<IActionResult> GetFreelancerOrders([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            var freelancerId = GetCurrentUserId();
            if (freelancerId == null) return Unauthorized();

            var orders = await _orderService.GetOrdersForFreelancerAsync(freelancerId.Value, pageNumber, pageSize);
            return Ok(orders);
        }

        [Authorize]
        [HttpPut("{orderId}/status")]
        public async Task<IActionResult> UpdateStatus(int orderId, [FromQuery] OrderStatus status)
        {
            var freelancerId = GetCurrentUserId();
            if (freelancerId == null) return Unauthorized();

            var result = await _orderService.UpdateOrderStatusAsync(orderId, freelancerId.Value, status);
            if (result) return Ok("تم تحديث حالة الطلب بنجاح!");
            return NotFound("الطلب غير موجود أو لا تملك صلاحية تعديله.");
        }

        [Authorize]
        [HttpPut("{orderId}/cancel")]
        public async Task<IActionResult> CancelOrder(int orderId)
        {
            var clientId = GetCurrentUserId();
            if (clientId == null) return Unauthorized();

            var result = await _orderService.CancelOrderAsync(orderId, clientId.Value);
            if (result) return Ok("تم إلغاء الطلب بنجاح!");
            return BadRequest("لا يمكن إلغاء الطلب. قد يكون غير موجود أو تمت الموافقة عليه مسبقاً.");
        }
    }
}