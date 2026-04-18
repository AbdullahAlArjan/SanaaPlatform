using Sanaa.DAL.Entities; 
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Sanaa.BLL.Interfaces
{
    public interface IServiceService
    {
        Task<IEnumerable<Service>> GetAllServicesAsync();
        Task<Service> GetServiceByIdAsync(int id);
        Task<bool> AddServiceAsync(Service service);
    }
}