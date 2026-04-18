namespace Sanaa.BLL.DTOs
{
    public class InvoiceResponse
    {
        public int InvoiceID { get; set; }
        public int OrderID { get; set; }
        public int PaymentID { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public DateTime IssueDate { get; set; }
        public decimal SubTotal { get; set; }
        public decimal TaxRate { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Notes { get; set; }
    }
}
