using Sanaa.BLL.DTOs;
using Sanaa.DAL.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sanaa.BLL.DTOs;

namespace Sanaa.BLL.Interfaces
{
    public interface IOrderService
    {
        Task<bool> CreateOrderAsync(int clientId, CreateOrderRequest request);
        Task<PagedResponse<OrderResponse>> GetOrdersForFreelancerAsync(int freelancerId, int pageNumber, int pageSize);
        Task<PagedResponse<OrderResponse>> GetOrdersForClientAsync(int clientId, int pageNumber, int pageSize);
        Task<bool> UpdateOrderStatusAsync(int orderId, int freelancerId, OrderStatus status);
        Task<bool> CancelOrderAsync(int orderId, int clientId);
    }
}