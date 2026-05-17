using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;
using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
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

            // ── File upload limits (must be before AddControllers) ────────────────
            builder.WebHost.ConfigureKestrel(options =>
            {
                options.Limits.MaxRequestBodySize = 10_485_760; // 10 MB
            });
            builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
            {
                options.MultipartBodyLengthLimit = 10_485_760; // 10 MB
            });

            // Add services to the container.
            builder.Services.AddHttpClient(); // IHttpClientFactory used by ChatbotController
            builder.Services.AddControllers()
                .AddJsonOptions(options =>
                {
                    // هاد السطر السحري بيمنع الـ API من الدخول في دوامة العلاقات
                    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
                });

            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddScoped<IOrderService, OrderService>();
            builder.Services.AddScoped<IFavoritesService, FavoritesService>();


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
            builder.Services.AddScoped<IReportService, ReportService>();
            builder.Services.AddScoped<IChatbotService, ChatbotService>();
            builder.Services.AddScoped<IEmailService, EmailService>();
            builder.Services.AddScoped<IFileUploadService, Sanaa.API.Services.FileUploadService>();
            builder.Services.AddScoped<ICategoryService, CategoryService>();

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

                // سياسة Login: منع brute-force — 5 محاولات كل دقيقة لكل IP
                options.AddFixedWindowLimiter("LoginPolicy", opt =>
                {
                    opt.PermitLimit = 5;
                    opt.Window = TimeSpan.FromMinutes(1);
                    opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                    opt.QueueLimit = 0;
                });

                // حماية عامة للـ API: 60 طلب/دقيقة لكل IP
                options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                        _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 60,
                            Window = TimeSpan.FromMinutes(1),
                            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                            QueueLimit = 0
                        }));

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

            // Resolve allowed origins — wildcard in dev, locked list in production
            var allowedOrigins = app.Environment.IsDevelopment()
                ? null  // null = allow any origin in dev (handled below)
                : builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                  ?? ["https://localhost:7101"];

            // 1. Swagger (dev only)
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            // 2. Routing must come before CORS so per-route CORS policies can resolve
            app.UseRouting();

            // 3. CORS — wildcard in dev; locked to configured origins in production
            if (app.Environment.IsDevelopment())
            {
                app.UseCors(policy =>
                    policy.AllowAnyHeader()
                          .AllowAnyMethod()
                          .SetIsOriginAllowed(_ => true) // dev only — any localhost origin
                          .AllowCredentials());          // required for SignalR
            }
            else
            {
                app.UseCors(policy =>
                    policy.WithOrigins(allowedOrigins!)
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials());
            }

            // 4. مطلوب لـ Stripe — enable request body buffering
            app.Use(async (context, next) =>
            {
                context.Request.EnableBuffering();
                await next();
            });

            app.UseHttpsRedirection();

            // Serve files from wwwroot (default static files)
            app.UseStaticFiles();

            // Serve uploaded images from <ContentRoot>/uploads → /uploads
            var uploadsPath = Path.Combine(app.Environment.ContentRootPath, "uploads");
            Directory.CreateDirectory(uploadsPath); // create the folder on first run if it doesn't exist
            app.UseStaticFiles(new StaticFileOptions
            {
                FileProvider = new PhysicalFileProvider(uploadsPath),
                RequestPath  = "/uploads"
            });

            // 5. الترتيب الصحيح لباقي الـ Middlewares
            app.UseRateLimiter();

            app.UseAuthentication();
            app.UseAuthorization();

            app.MapControllers();
            app.MapHub<NotificationHub>("/notificationHub");

            app.Run();
        }
    }
}