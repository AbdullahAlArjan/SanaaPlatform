using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Sanaa.API.Hubs;
using Sanaa.API.Services;
using Sanaa.BLL.Interfaces;
using Sanaa.BLL.Services;
using Sanaa.DAL;
using System.Text;

namespace Sanaa.API
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.
            builder.Services.AddControllers()
                .AddJsonOptions(options =>
                {
                    // هاد السطر السحري بيمنع الـ API من الدخول في دوامة العلاقات
                    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
                });

            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddScoped<IOrderService, OrderService>();


            // 🌟 التعديل الأول: كود الـ Swagger الجديد انحط هون بدل السطر القديم
            builder.Services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo { Title = "Sanaa API", Version = "v1" });

                // 1. تعريف شكل القفل
                c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Description = "الرجاء إدخال التوكن بهذا الشكل: Bearer {your_token}",
                    Name = "Authorization",
                    In = ParameterLocation.Header,
                    Type = SecuritySchemeType.ApiKey,
                    Scheme = "Bearer"
                });

                // 2. تطبيق القفل على كل الـ API
                c.AddSecurityRequirement(new OpenApiSecurityRequirement()
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id = "Bearer"
                            },
                            Scheme = "oauth2",
                            Name = "Bearer",
                            In = ParameterLocation.Header,
                        },
                        new List<string>()
                    }
                });
            });

            builder.Services.AddDbContext<SanaaDbContext>(options =>
                options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

            builder.Services.AddScoped<IServiceService, ServiceService>();
            builder.Services.AddScoped<IFreelancerService, FreelancerService>();
            builder.Services.AddScoped<IReviewService, ReviewService>();
            // بنحكي للسيرفر: لما الـ BLL يطلب INotificationService، أعطيه SignalRNotificationService
            builder.Services.AddScoped<INotificationService, SignalRNotificationService>();
            builder.Services.AddScoped<IUserService, UserService>();
            builder.Services.AddScoped<IOtpService, OtpService>();
            builder.Services.AddScoped<IPaymentService, PaymentService>();
            builder.Services.AddScoped<IInvoiceService, InvoiceService>();
            builder.Services.AddScoped<IReportService, ReportService>();
            builder.Services.AddScoped<IChatbotService, ChatbotService>();

            // Rate Limiting: حماية من الـ abuse
            builder.Services.AddRateLimiter(options =>
            {
                // سياسة صارمة لـ OTP: 3 طلبات كل 10 دقائق لكل IP
                options.AddFixedWindowLimiter("OtpPolicy", opt =>
                {
                    opt.PermitLimit = 3;
                    opt.Window = TimeSpan.FromMinutes(10);
                    opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                    opt.QueueLimit = 0;
                });

                // سياسة عامة للـ Chatbot: 20 رسالة في الدقيقة
                options.AddFixedWindowLimiter("ChatbotPolicy", opt =>
                {
                    opt.PermitLimit = 20;
                    opt.Window = TimeSpan.FromMinutes(1);
                    opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                    opt.QueueLimit = 0;
                });

                options.OnRejected = async (context, token) =>
                {
                    context.HttpContext.Response.StatusCode = 429;
                    await context.HttpContext.Response.WriteAsync(
                        "طلبات كثيرة جداً. حاول مرة أخرى لاحقاً.", token);
                };
            });
            builder.Services.AddSignalR();

            builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        ValidIssuer = builder.Configuration["Jwt:Issuer"],
                        ValidAudience = builder.Configuration["Jwt:Audience"],
                        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]))
                    };
                });

            var app = builder.Build();

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            // مطلوب عشان Stripe Webhook يقدر يقرأ الـ raw body للتحقق من الـ signature
            app.Use(async (context, next) =>
            {
                context.Request.EnableBuffering();
                await next();
            });

            app.UseHttpsRedirection();
            app.UseCors(policy => policy.AllowAnyHeader().AllowAnyMethod().AllowAnyOrigin());

          
            app.UseRateLimiter();
            app.UseAuthentication();
            app.UseAuthorization();

            app.MapControllers();
            app.MapHub<NotificationHub>("/notificationHub");

            app.Run();
        }
    }
}