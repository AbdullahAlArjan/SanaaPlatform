using Sanaa.BLL.DTOs;

namespace Sanaa.BLL.Interfaces
{
    public interface IChatbotService
    {
        Task<string> GetResponseAsync(string message, List<ChatMessageDto> conversationHistory);
    }
}
