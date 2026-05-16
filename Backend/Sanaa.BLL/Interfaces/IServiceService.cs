using Sanaa.DAL.Entities; 
using Sanaa.BLL.DTOs;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Sanaa.BLL.Interfaces
{
    public interface IServiceService
    {
        Task<IEnumerable<Service>> GetAllServicesAsync(int? categoryId = null);
        Task<Service> GetServiceByIdAsync(int id);
        /// <summary>Returns a rich service detail including category name and freelancer info.</summary>
        Task<ServiceDetailDto?> GetServiceDetailAsync(int id);
        Task<bool> AddServiceAsync(CreateServiceRequest request);
        Task<bool> UpdateServiceAsync(int id, UpdateServiceRequest request);
        Task<bool> DeleteServiceAsync(int id);
    }
}