using System;
using Microsoft.EntityFrameworkCore;
using Sanaa.BLL.DTOs;
using Sanaa.BLL.Interfaces;
using Sanaa.DAL;
using Sanaa.DAL.Entities;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Sanaa.BLL.DTOs;

namespace Sanaa.BLL.Services
{
    public class OrderService : IOrderService
    {
        private readonly SanaaDbContext _context;

        private readonly INotificationService _notificationService;

        public OrderService(SanaaDbContext context, INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        // 1. إنشاء طلب جديد
        public async Task<bool> CreateOrderAsync(CreateOrderRequest request)
        {
            var order = new Order
            {
                ClientID = request.ClientID,
                FreelancerID = request.FreelancerID,
                Description = request.Description,
                Location = request.Location,
                Status = OrderStatus.Pending // بنبلش دايما قيد الانتظار
            };

            _context.Orders.Add(order);
            return await _context.SaveChangesAsync() > 0;
            // بنفترض إنك بتعرف مين الصنايعي اللي إجاله الطلب (مثلاً FreelancerId)
            await _notificationService.SendNotificationToUserAsync(order.FreelancerID, $"إجالك طلب جديد من {order.Client}! 🚀");
        }

        // 2. جلب طلبات صنايعي معين
        public async Task<IEnumerable<OrderResponse>> GetOrdersForFreelancerAsync(int freelancerId)
        {
            var orders = await _context.Orders
                .Include(o => o.Client) // عشان نجيب اسم الزبون
                .Where(o => o.FreelancerID == freelancerId)
                .OrderByDescending(o => o.OrderDate) // الأحدث أولاً
                .ToListAsync();

            return orders.Select(o => new OrderResponse
            {
                OrderID = o.OrderID,
                ClientName = o.Client.FullName, // جبنا الاسم من جدول اليوزرز
                Description = o.Description,
                Location = o.Location,
                OrderDate = o.OrderDate,
                Status = o.Status.ToString() // بنحول الحالة لنص مقروء
            });
        }

        // 3. تحديث حالة الطلب (مقبول، مرفوض، مكتمل)
        public async Task<bool> UpdateOrderStatusAsync(int orderId, OrderStatus status)
        {
            var order = await _context.Orders.FindAsync(orderId);
            if (order == null) return false;

            order.Status = status;
            return await _context.SaveChangesAsync() > 0;
        }
    }
}