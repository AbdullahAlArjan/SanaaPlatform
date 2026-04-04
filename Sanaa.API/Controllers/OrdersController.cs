using Microsoft.AspNetCore.Mvc;
using Sanaa.BLL.DTOs;
using Sanaa.BLL.Interfaces;
using Sanaa.DAL.Entities;
using System.Threading.Tasks;
using Sanaa.BLL.DTOs;

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

        [HttpPost("create")]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request)
        {
            var result = await _orderService.CreateOrderAsync(request);
            if (result) return Ok("تم إرسال الطلب للصنايعي بنجاح! 🚀");
            return BadRequest("حدث خطأ أثناء إرسال الطلب.");
        }

        [HttpGet("freelancer/{freelancerId}")]
        public async Task<IActionResult> GetFreelancerOrders(int freelancerId)
        {
            var orders = await _orderService.GetOrdersForFreelancerAsync(freelancerId);
            return Ok(orders);
        }

        [HttpPut("{orderId}/status")]
        public async Task<IActionResult> UpdateStatus(int orderId, [FromQuery] OrderStatus status)
        {
            var result = await _orderService.UpdateOrderStatusAsync(orderId, status);
            if (result) return Ok("تم تحديث حالة الطلب بنجاح!");
            return NotFound("الطلب غير موجود.");
        }
    }
}