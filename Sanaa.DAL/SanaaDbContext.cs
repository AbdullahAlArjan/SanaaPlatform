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

        // هاي الميثود بنستخدمها عشان نكتب إعدادات متقدمة للداتا بيس (Fluent API)
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // هون بنحل مشكلة الجدول الوسيط اللي حكينا عنها!
            // بنحكي للـ EF إنه هاد الجدول إله مفتاح مركب (Composite Key) مكون من حقلين
            modelBuilder.Entity<FreelancerService>()
                .HasKey(fs => new { fs.FreelancerID, fs.ServiceID });
        }
    }
}