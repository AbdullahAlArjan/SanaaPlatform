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
        }
    }
}