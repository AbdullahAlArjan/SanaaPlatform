namespace Sanaa.BLL.DTOs
{
    public class ChatMessageDto
    {
        public string Role { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
    }

    public class ChatbotRequest
    {
        public string Message { get; set; } = string.Empty;
        public List<ChatMessageDto> ConversationHistory { get; set; } = new();
    }

    public class ChatbotResponse
    {
        public string Reply { get; set; } = string.Empty;
    }
}
