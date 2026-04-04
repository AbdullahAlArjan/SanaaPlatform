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
        Task<IEnumerable<OrderResponse>> GetOrdersForFreelancerAsync(int freelancerId);
        Task<bool> UpdateOrderStatusAsync(int orderId, OrderStatus status);
    }
}