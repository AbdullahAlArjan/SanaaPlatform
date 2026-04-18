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
        private readonly IEmailService _emailService;

        public OrderService(SanaaDbContext context, INotificationService notificationService, IEmailService emailService)
        {
            _context = context;
            _notificationService = notificationService;
            _emailService = emailService;
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
                Status = OrderStatus.Pending
            };

            _context.Orders.Add(order);
            var saved = await _context.SaveChangesAsync() > 0;
            if (!saved) return false;

            // جلب بيانات الصنايعي لإرسال الإشعار والإيميل
            var freelancerUser = await _context.Users.FindAsync(request.FreelancerID);
            var clientUser = await _context.Users.FindAsync(request.ClientID);

            await _notificationService.SendNotificationToUserAsync(order.FreelancerID, $"إجالك طلب جديد من {clientUser?.FullName ?? "زبون"}!");

            if (freelancerUser != null)
            {
                await _emailService.SendAsync(
                    freelancerUser.Email,
                    freelancerUser.FullName,
                    "طلب جديد - منصة صناع",
                    $"<div dir='rtl'><h3>مرحباً {freelancerUser.FullName}</h3>" +
                    $"<p>لديك طلب جديد من {clientUser?.FullName ?? "زبون"}.</p>" +
                    $"<p><strong>التفاصيل:</strong> {order.Description}</p>" +
                    $"<p><strong>الموقع:</strong> {order.Location}</p>" +
                    $"<p>سجّل دخولك لمراجعة الطلب والرد عليه.</p></div>");
            }

            return true;
        }

        // 2. جلب طلبات صنايعي معين
        public async Task<PagedResponse<OrderResponse>> GetOrdersForFreelancerAsync(int freelancerId, int pageNumber, int pageSize)
        {
            var query = _context.Orders
                .Include(o => o.Client)
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
                    OrderID = o.OrderID,
                    ClientName = o.Client.FullName,
                    Description = o.Description,
                    Location = o.Location,
                    OrderDate = o.OrderDate,
                    Status = o.Status.ToString()
                }),
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }

        // 3. تحديث حالة الطلب (مقبول، مرفوض، مكتمل)
        public async Task<bool> UpdateOrderStatusAsync(int orderId, OrderStatus status)
        {
            var order = await _context.Orders
                .Include(o => o.Client)
                .FirstOrDefaultAsync(o => o.OrderID == orderId);
            if (order == null) return false;

            order.Status = status;
            var saved = await _context.SaveChangesAsync() > 0;
            if (!saved) return false;

            // إرسال إيميل للزبون حسب الحالة الجديدة
            if (order.Client != null && status != OrderStatus.Pending)
            {
                var (subject, body) = status switch
                {
                    OrderStatus.Accepted => (
                        "تم قبول طلبك - منصة صناع",
                        $"<div dir='rtl'><h3>مرحباً {order.Client.FullName}</h3><p>تم <strong>قبول</strong> طلبك رقم {orderId}. سيتواصل معك الصنايعي قريباً.</p></div>"),
                    OrderStatus.Rejected => (
                        "تم رفض طلبك - منصة صناع",
                        $"<div dir='rtl'><h3>مرحباً {order.Client.FullName}</h3><p>نأسف، تم <strong>رفض</strong> طلبك رقم {orderId}. يمكنك البحث عن صنايعي آخر.</p></div>"),
                    OrderStatus.Completed => (
                        "اكتمل طلبك - منصة صناع",
                        $"<div dir='rtl'><h3>مرحباً {order.Client.FullName}</h3><p>تم <strong>إكمال</strong> طلبك رقم {orderId} بنجاح. يسعدنا سماع تقييمك!</p></div>"),
                    _ => (string.Empty, string.Empty)
                };

                if (!string.IsNullOrEmpty(subject))
                    await _emailService.SendAsync(order.Client.Email, order.Client.FullName, subject, body);
            }

            return true;
        }
    }
}