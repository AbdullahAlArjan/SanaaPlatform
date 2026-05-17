using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sanaa.BLL.Interfaces;

namespace Sanaa.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class InvoicesController : ControllerBase
    {
        private readonly IInvoiceService _invoiceService;

        public InvoicesController(IInvoiceService invoiceService)
        {
            _invoiceService = invoiceService;
        }

        [HttpGet("order/{orderId}")]
        public async Task<IActionResult> GetInvoiceByOrder(int orderId)
        {
            var invoice = await _invoiceService.GetInvoiceByOrderAsync(orderId);
            if (invoice == null) return NotFound("لا توجد فاتورة لهذا الطلب");
            return Ok(invoice);
        }
    }
}
