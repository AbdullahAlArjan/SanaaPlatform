using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Sanaa.BLL.Interfaces;
using Sanaa.BLL.DTOs;
using Sanaa.DAL.Entities;
using System.Threading.Tasks;

namespace Sanaa.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ServicesController : ControllerBase
    {
        private readonly IServiceService _serviceService;

        public ServicesController(IServiceService serviceService)
        {
            _serviceService = serviceService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllServices()
        {
            var services = await _serviceService.GetAllServicesAsync();
            return Ok(services);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetServiceById(int id)
        {
            var service = await _serviceService.GetServiceByIdAsync(id);
            if (service == null)
                return NotFound("الخدمة غير موجودة");

            return Ok(service);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<IActionResult> AddService([FromBody] CreateServiceRequest request)
        {
            var result = await _serviceService.AddServiceAsync(request);
            if (result) return Ok("تمت إضافة الخدمة بنجاح");
            return BadRequest("فشلت عملية إضافة الخدمة");
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateService(int id, [FromBody] UpdateServiceRequest request)
        {
            var result = await _serviceService.UpdateServiceAsync(id, request);
            if (result) return Ok("تم تحديث الخدمة بنجاح");
            return NotFound("الخدمة غير موجودة");
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteService(int id)
        {
            var result = await _serviceService.DeleteServiceAsync(id);
            if (result) return Ok("تم حذف الخدمة بنجاح");
            return NotFound("الخدمة غير موجودة");
        }
    }
}