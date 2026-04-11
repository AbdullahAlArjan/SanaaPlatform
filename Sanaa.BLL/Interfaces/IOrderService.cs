using Sanaa.BLL.DTOs;
using Sanaa.DAL.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sanaa.BLL.DTOs;

namespace Sanaa.BLL.Interfaces
{
    public interface IOrderService
    {
        Task<bool> CreateOrderAsync(CreateOrderRequest request);
        Task<PagedResponse<OrderResponse>> GetOrdersForFreelancerAsync(int freelancerId, int pageNumber, int pageSize);
        Task<bool> UpdateOrderStatusAsync(int orderId, OrderStatus status);
    }
}