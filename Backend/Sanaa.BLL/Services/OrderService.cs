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

        // 1. إنشاء طلب جديد — returns the new OrderID on success, null on failure
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

            // جلب بيانات الصنايعي لإرسال الإشعار والإيميل
            var freelancerUser = await _context.Users.FindAsync(request.FreelancerID);
            var clientUser = await _context.Users.FindAsync(clientId);

            // Push notification — fast local DB write, safe to await inline
            await _notificationService.SendNotificationToUserAsync(
                order.FreelancerID,
                $"إجالك طلب جديد من {clientUser?.FullName ?? "زبون"}!");

            // Email — fire-and-forget so SMTP latency/failure never blocks the HTTP response.
            // The orderId is returned to the frontend immediately after SaveChanges succeeds.
            if (freelancerUser != null)
            {
                var toEmail   = freelancerUser.Email;
                var toName    = freelancerUser.FullName;
                var clientName = clientUser?.FullName ?? "زبون";
                var desc      = order.Description;
                var loc       = order.Location;

                _ = Task.Run(async () =>
                {
                    try
                    {
                        await _emailService.SendAsync(
                            toEmail, toName,
                            "طلب جديد - منصة صناع",
                            $"<div dir='rtl'><h3>مرحباً {toName}</h3>" +
                            $"<p>لديك طلب جديد من {clientName}.</p>" +
                            $"<p><strong>التفاصيل:</strong> {desc}</p>" +
                            $"<p><strong>الموقع:</strong> {loc}</p>" +
                            $"<p>سجّل دخولك لمراجعة الطلب والرد عليه.</p></div>");
                    }
                    catch (Exception ex)
                    {
                        // Email failure must never propagate back to the caller.
                        // TODO: replace Console.WriteLine with ILogger once injected.
                        Console.WriteLine($"[OrderService] Order notification email failed: {ex.Message}");
                    }
                });
            }

            return order.OrderID;   // returned immediately — email sends in the background
        }

        // 2. جلب طلبات صنايعي معين
        public async Task<PagedResponse<OrderResponse>> GetOrdersForFreelancerAsync(int freelancerId, int pageNumber, int pageSize)
        {
            var query = _context.Orders
                .Include(o => o.Client)
                .Include(o => o.Freelancer).ThenInclude(f => f.User)
                .Include(o => o.Service)
                .Where(o => o.FreelancerID == freelancerId)
                .OrderByDescending(o => o.OrderDate);

            var totalCount = await query.CountAsync();
            var orders = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            // Safe loop: one corrupted/orphaned order never crashes the whole response.
            // Each row is mapped independently; any null-reference is caught and skipped.
            var safeOrdersList = new List<OrderResponse>();

            foreach (var o in orders)
            {
                try
                {
                    safeOrdersList.Add(new OrderResponse
                    {
                        OrderID              = o.OrderID,
                        ClientName           = o.Client?.FullName           ?? "Unknown Client",
                        ClientPhone          = o.Client?.Phone              ?? "",
                        FreelancerID         = o.FreelancerID,
                        FreelancerName       = o.Freelancer?.User?.FullName ?? "Unknown",
                        ServiceID            = o.ServiceID,
                        ServiceTitle         = o.Service?.Title             ?? "Unknown Service",
                        ServicePriceSnapshot = o.ServicePriceSnapshot       ?? 0m,
                        Price                = o.ServicePriceSnapshot       ?? 0m,
                        Description          = o.Description                ?? "",
                        Location             = o.Location                   ?? "",
                        OrderDate            = o.OrderDate,
                        Status               = o.Status.ToString()
                    });
                }
                catch
                {
                    // Skip rows that cannot be mapped (orphaned FKs, corrupted data, etc.)
                    continue;
                }
            }

            return new PagedResponse<OrderResponse>
            {
                Data       = safeOrdersList,
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize   = pageSize
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

        // 3. تحديث حالة الطلب (مقبول، مرفوض، مكتمل)
        public async Task<bool> UpdateOrderStatusAsync(int orderId, int freelancerId, OrderStatus status)
        {
            var order = await _context.Orders
                .Include(o => o.Client)
                .FirstOrDefaultAsync(o => o.OrderID == orderId && o.FreelancerID == freelancerId);
            if (order == null) return false;

            order.Status = status;
            var saved = await _context.SaveChangesAsync() > 0;
            if (!saved) return false;

            // إرسال إيميل للزبون حسب الحالة الجديدة — fire-and-forget (same reason as CreateOrderAsync)
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
                {
                    var clientEmail = order.Client.Email;
                    var clientName  = order.Client.FullName;
                    var subjectCopy = subject;
                    var bodyCopy    = body;

                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            await _emailService.SendAsync(clientEmail, clientName, subjectCopy, bodyCopy);
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"[OrderService] Status-change email failed: {ex.Message}");
                        }
                    });
                }
            }

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