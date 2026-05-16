using System;
using Microsoft.EntityFrameworkCore;
using Sanaa.BLL.DTOs;
using Sanaa.BLL.Interfaces;
using Sanaa.DAL;
using Sanaa.DAL.Entities;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Sanaa.BLL.Services
{
    public class OrderService : IOrderService
    {
        private readonly SanaaDbContext _context;
        private readonly INotificationService _notificationService;
        private readonly IEmailService _emailService;

        public OrderService(SanaaDbContext context, INotificationService notificationService, IEmailService emailService)
        {
            _context = context;
            _notificationService = notificationService;
            _emailService = emailService;
        }

        // 1. إنشاء طلب جديد 
        public async Task<int?> CreateOrderAsync(int clientId, CreateOrderRequest request)
        {
            // Fetch service to get its price
            var service = await _context.Services.FindAsync(request.ServiceID);
            if (service == null) return null;

            var order = new Order
            {
                ClientID             = clientId,
                FreelancerID         = request.FreelancerID,
                ServiceID            = request.ServiceID,
                ServicePriceSnapshot = service.BasePrice,
                Description          = request.Description,
                Location             = request.Location,
                Status               = OrderStatus.Pending
            };

            _context.Orders.Add(order);
            var saved = await _context.SaveChangesAsync() > 0;
            if (!saved) return null;

            var clientUser = await _context.Users.FindAsync(clientId);

            // Push notification 
            await _notificationService.SendNotificationToUserAsync(
                order.FreelancerID,
                $"إجالك طلب جديد من {clientUser?.FullName ?? "زبون"}!");

            // 🛑 [تم إيقاف الإيميل مؤقتاً لاختبار بوابة الدفع سترايب] 🛑
            /*
            var freelancerUser = await _context.Users.FindAsync(request.FreelancerID);
            if (freelancerUser != null)
            {
                var toEmail   = freelancerUser.Email;
                var toName    = freelancerUser.FullName;
                var clientName = clientUser?.FullName ?? "زبون";
                var desc      = order.Description;
                var loc       = order.Location;

                try
                {
                    await _emailService.SendAsync(toEmail, toName, "طلب جديد - منصة صناع", $"...");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Email skipped: {ex.Message}");
                }
            }
            */

            return order.OrderID;   // رح يرجع فوراً بدون أي تأخير!
        }

        // 2. جلب طلبات صنايعي معين
        public async Task<PagedResponse<OrderResponse>> GetOrdersForFreelancerAsync(int freelancerId, int pageNumber, int pageSize)
        {
            var query = _context.Orders
                .Include(o => o.Client)                              // ClientName + ClientPhone
                .Include(o => o.Freelancer).ThenInclude(f => f.User) // FIX: was null → HTTP 500
                .Include(o => o.Service)                             // ServiceTitle
                .Where(o => o.FreelancerID == freelancerId)
                .OrderByDescending(o => o.OrderDate);

            var totalCount = await query.CountAsync();
            var orders = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new PagedResponse<OrderResponse>
            {
                Data = orders.Select(o => new OrderResponse
                {
                    OrderID              = o.OrderID,
                    ClientName           = o.Client.FullName,
                    ClientPhone          = o.Client.Phone ?? string.Empty,
                    FreelancerName       = o.Freelancer?.User?.FullName ?? "صنايعي",
                    ServiceID            = o.ServiceID,
                    ServiceTitle         = o.Service?.Title ?? string.Empty,
                    ServicePriceSnapshot = o.ServicePriceSnapshot ?? 0m,
                    Description          = o.Description,
                    Location             = o.Location,
                    OrderDate            = o.OrderDate,
                    Status               = o.Status.ToString()
                }),
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }

        public async Task<PagedResponse<OrderResponse>> GetOrdersForClientAsync(int clientId, int pageNumber, int pageSize)
        {
            var query = _context.Orders
                .Include(o => o.Freelancer)
                    .ThenInclude(f => f.User)
                .Where(o => o.ClientID == clientId)
                .OrderByDescending(o => o.OrderDate);

            var totalCount = await query.CountAsync();
            var orders = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new PagedResponse<OrderResponse>
            {
                Data = orders.Select(o => new OrderResponse
                {
                    OrderID      = o.OrderID,
                    ClientName   = "أنا",
                    FreelancerID = o.FreelancerID,
                    FreelancerName = o.Freelancer.User?.FullName ?? "صنايعي",
                    ServiceID    = o.ServiceID,
                    Description  = o.Description,
                    Location     = o.Location,
                    OrderDate    = o.OrderDate,
                    Status       = o.Status.ToString()
                }),
                TotalCount = totalCount,
                PageNumber  = pageNumber,
                PageSize    = pageSize
            };
        }

        // 3. تحديث حالة الطلب
        public async Task<bool> UpdateOrderStatusAsync(int orderId, int freelancerId, OrderStatus status)
        {
            var order = await _context.Orders
                .Include(o => o.Client)
                .FirstOrDefaultAsync(o => o.OrderID == orderId && o.FreelancerID == freelancerId);
            if (order == null) return false;

            order.Status = status;
            var saved = await _context.SaveChangesAsync() > 0;
            if (!saved) return false;

            // 🛑 [تم إيقاف الإيميل مؤقتاً لاختبار بوابة الدفع سترايب] 🛑
            /*
            if (order.Client != null && status != OrderStatus.Pending)
            {
                // ... Email logic
            }
            */

            return true;
        }

        public async Task<bool> CancelOrderAsync(int orderId, int clientId)
        {
            var order = await _context.Orders.FirstOrDefaultAsync(o => o.OrderID == orderId && o.ClientID == clientId);
            if (order == null || order.Status != OrderStatus.Pending) return false;

            order.Status = OrderStatus.Rejected; // Treating cancellation as rejected
            return await _context.SaveChangesAsync() > 0;
        }
    }
}