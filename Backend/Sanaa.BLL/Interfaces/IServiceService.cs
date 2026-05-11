using Sanaa.DAL.Entities; 
using Sanaa.BLL.DTOs;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Sanaa.BLL.Interfaces
{
    public interface IServiceService
    {
        Task<IEnumerable<Service>> GetAllServicesAsync();
        Task<Service> GetServiceByIdAsync(int id);
        Task<bool> AddServiceAsync(CreateServiceRequest request);
        Task<bool> UpdateServiceAsync(int id, UpdateServiceRequest request);
        Task<bool> DeleteServiceAsync(int id);
    }
}