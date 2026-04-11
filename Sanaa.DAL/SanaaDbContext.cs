using Microsoft.EntityFrameworkCore;
using Sanaa.DAL.Entities; // عشان يشوف الكلاسات اللي عملناها

namespace Sanaa.DAL
{
    // لازم نورث من كلاس DbContext الجاهز من مايكروسوفت
    public class SanaaDbContext : DbContext
    {
        // هاد الـ Constructor بيستقبل الإعدادات (زي رابط الداتا بيس) من الـ API
        public SanaaDbContext(DbContextOptions<SanaaDbContext> options) : base(options)
        {
        }

        // ⬇️ هون بنسجل جداولنا عشان الـ EF يبنيها بالـ SQL ⬇️
        public DbSet<User> Users { get; set; }
        public DbSet<FreelancerProfile> FreelancerProfiles { get; set; }
        public DbSet<Service> Services { get; set; }
        public DbSet<FreelancerService> FreelancerServices { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<Review> Reviews { get; set; }
        public DbSet<OtpCode> OtpCodes { get; set; }
        public DbSet<Payment> Payments { get; set; }
        public DbSet<Invoice> Invoices { get; set; }
        public DbSet<Report> Reports { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<Category> Categories { get; set; }

        // هاي الميثود بنستخدمها عشان نكتب إعدادات متقدمة للداتا بيس (Fluent API)
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // 1. تعريف المفتاح المركب لجدول الكسر (عشان يختفي الإيرور الجديد)
            modelBuilder.Entity<FreelancerService>()
                .HasKey(fs => new { fs.FreelancerID, fs.ServiceID });

            // 2. إيقاف الحذف المتسلسل لجهة الزبون في الطلبات (عشان إيرور اللوب القديم)
            modelBuilder.Entity<Order>()
                .HasOne(o => o.Client)
                .WithMany()
                .HasForeignKey(o => o.ClientID)
                .OnDelete(DeleteBehavior.Restrict);

            // 3. إيقاف الحذف المتسلسل لجهة الصنايعي في الطلبات
            modelBuilder.Entity<Order>()
                .HasOne(o => o.Freelancer)
                .WithMany()
                .HasForeignKey(o => o.FreelancerID)
                .OnDelete(DeleteBehavior.Restrict);

            // 4. إيقاف الحذف المتسلسل للتقييمات (عشان ما يصير Error 1785)
            modelBuilder.Entity<Review>()
                .HasOne(r => r.Client)
                .WithMany()
                .HasForeignKey(r => r.ClientID)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Review>()
                .HasOne(r => r.Freelancer)
                .WithMany()
                .HasForeignKey(r => r.FreelancerID)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Review>()
                .HasOne(r => r.Order)
                .WithMany()
                .HasForeignKey(r => r.OrderID)
                .OnDelete(DeleteBehavior.Restrict);

            // OtpCodes: Cascade delete (حذف اليوزر يحذف OTPs تبعه)
            modelBuilder.Entity<OtpCode>()
                .HasOne(o => o.User)
                .WithMany(u => u.OtpCodes)
                .HasForeignKey(o => o.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Payment: Restrict delete (ما نحذف Order عنده Payment)
            modelBuilder.Entity<Payment>()
                .HasOne(p => p.Order)
                .WithOne(o => o.Payment)
                .HasForeignKey<Payment>(p => p.OrderId)
                .OnDelete(DeleteBehavior.Restrict);

            // Invoice - Order: 1:1
            modelBuilder.Entity<Invoice>()
                .HasOne(i => i.Order)
                .WithOne(o => o.Invoice)
                .HasForeignKey<Invoice>(i => i.OrderID)
                .OnDelete(DeleteBehavior.Restrict);

            // Invoice - Payment: 1:1
            modelBuilder.Entity<Invoice>()
                .HasOne(i => i.Payment)
                .WithOne(p => p.Invoice)
                .HasForeignKey<Invoice>(i => i.PaymentID)
                .OnDelete(DeleteBehavior.Restrict);

            // Reports: Restrict delete + Unique index لمنع بلاغين من نفس المستخدم على نفس الـ target
            modelBuilder.Entity<Report>()
                .HasOne(r => r.Reporter)
                .WithMany(u => u.Reports)
                .HasForeignKey(r => r.ReporterID)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Report>()
                .HasIndex(r => new { r.ReporterID, r.TargetType, r.TargetID })
                .IsUnique();

            // RefreshTokens: Cascade delete (حذف اليوزر يحذف توكناته)
            modelBuilder.Entity<RefreshToken>()
                .HasOne(rt => rt.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(rt => rt.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Category - Service: One-to-Many (حذف القسم يخلي الخدمات بدون قسم)
            modelBuilder.Entity<Service>()
                .HasOne(s => s.Category)
                .WithMany(c => c.Services)
                .HasForeignKey(s => s.CategoryID)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}