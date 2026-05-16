namespace Sanaa.BLL.DTOs
{
    public class FavoriteServiceResponse
    {
        public int      ServiceID   { get; set; }
        public string   Title       { get; set; } = string.Empty;
        public string   Description { get; set; } = string.Empty;
        public decimal  BasePrice   { get; set; }
        public DateTime SavedAt     { get; set; }
    }
}
