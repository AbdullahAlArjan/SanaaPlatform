using Microsoft.AspNetCore.Mvc;
using Sanaa.BLL.Interfaces;
using Sanaa.DAL.Entities;
using System.Threading.Tasks;

namespace Sanaa.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ServicesController : ControllerBase
    {
        private readonly IServiceService _serviceService;

        // حقن الـ Service (Dependency Injection)
        public ServicesController(IServiceService serviceService)
        {
            _serviceService = serviceService;
        }

        // 1. جلب كل الخدمات (مثلاً لعرضها بقائمة منسدلة Dropdown)
        [HttpGet]
        public async Task<IActionResult> GetAllServices()
        {
            var services = await _serviceService.GetAllServicesAsync();
            return Ok(services);
        }

        // 2. جلب خدمة معينة حسب رقمها
        [HttpGet("{id}")]
        public async Task<IActionResult> GetServiceById(int id)
        {
            var service = await _serviceService.GetServiceByIdAsync(id);
            if (service == null)
                return NotFound("الخدمة غير موجودة");

            return Ok(service);
        }

        // 3. إضافة خدمة جديدة للمنصة
        [HttpPost]
        public async Task<IActionResult> AddService([FromBody] Service service)
        {
            var result = await _serviceService.AddServiceAsync(service);
            if (result)
                return Ok("تمت إضافة الخدمة بنجاح");

            return BadRequest("فشلت عملية إضافة الخدمة");
        }
    }
}