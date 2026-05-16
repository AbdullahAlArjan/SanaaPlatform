namespace Sanaa.DAL.Entities
{
    public class FavoriteService
    {
        public int UserID    { get; set; }
        public int ServiceID { get; set; }

        public DateTime SavedAt { get; set; } = DateTime.UtcNow;

        public virtual User    User    { get; set; } = null!;
        public virtual Service Service { get; set; } = null!;
    }
}
