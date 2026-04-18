using Microsoft.Extensions.Configuration;
using Sanaa.BLL.DTOs;
using Sanaa.BLL.Interfaces;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace Sanaa.BLL.Services
{
    public class ChatbotService : IChatbotService
    {
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;

        private const string SystemPrompt =
            "اسمك صناع، مساعد ذكي لمنصة صناع — منصة للعمل الحر تربط الزبائن بالحرفيين والصنايعية في الأردن. " +
            "قدّم نفسك دائماً باسم 'صناع' عند السؤال عن هويتك. " +
            "مهمتك مساعدة المستخدمين في:\n" +
            "- البحث عن الحرفيين المناسبين حسب التخصص والمدينة\n" +
            "- شرح كيفية إنشاء طلب (Order) وتتبع حالته\n" +
            "- الإجابة على أسئلة الدفع والفواتير\n" +
            "- شرح كيفية التسجيل كصنايعي أو زبون\n" +
            "- شرح نظام التقييمات والبلاغات\n" +
            "أجب دائماً بالعربية ما لم يتحدث المستخدم بلغة أخرى. كن ودوداً ومختصراً.";

        public ChatbotService(IConfiguration configuration)
        {
            _configuration = configuration;
            _httpClient = new HttpClient();
        }

        public async Task<string> GetResponseAsync(string message, List<ChatMessageDto> conversationHistory)
        {
            var apiKey = _configuration["Anthropic:ApiKey"];

            var messages = conversationHistory
                .Select(h => new { role = h.Role, content = h.Content })
                .ToList<object>();

            messages.Add(new { role = "user", content = message });

            var requestBody = new
            {
                model = "claude-haiku-4-5-20251001",
                max_tokens = 1024,
                system = SystemPrompt,
                messages
            };

            var json = JsonSerializer.Serialize(requestBody);
            var request = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages");
            request.Headers.Add("x-api-key", apiKey);
            request.Headers.Add("anthropic-version", "2023-06-01");
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
                return "عذراً، لم أتمكن من الإجابة حالياً. حاول مرة أخرى.";

            var responseJson = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseJson);

            return doc.RootElement
                .GetProperty("content")[0]
                .GetProperty("text")
                .GetString() ?? "عذراً، لم أتمكن من الإجابة حالياً.";
        }
    }
}
