using Microsoft.Extensions.Configuration;
using Sanaa.BLL.DTOs;
using Sanaa.BLL.Interfaces;
using System.Text;
using System.Text.Json;

namespace Sanaa.BLL.Services
{
    public class ChatbotService : IChatbotService
    {
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;

        private const string SystemPrompt =
            "أنت المساعد الذكي الرسمي لمنصة 'صنعة' (Sanaa Platform). " +
            "منصة صنعة هي سوق عمل حر يربط بين العملاء والصنايعية أو المستقلين (Freelancers) لتقديم خدمات احترافية. " +
            "أجب على أسئلة المستخدمين بلهجة أردنية/عربية ودودة ومحترفة. " +
            "لا تخترع أسماء صنايعية أو أسعار من رأسك. " +
            "إذا سألك المستخدم عن كيفية الطلب، اشرح له أنه يمكنه تصفح الخدمات وطلبها مباشرة من لوحة التحكم.\n\n" +
            "قدّم نفسك دائماً باسم 'صنّاع' عند السؤال عن هويتك.\n" +
            "مهمتك مساعدة المستخدمين في:\n" +
            "- البحث عن الصنايعية والحرفيين حسب التخصص والمدينة\n" +
            "- شرح كيفية إنشاء طلب (Order) وتتبع حالته\n" +
            "- الإجابة على أسئلة الدفع والفواتير\n" +
            "- شرح كيفية التسجيل كصنايعي أو كزبون\n" +
            "- شرح نظام التقييمات والبلاغات\n" +
            "أجب دائماً بالعربية ما لم يتحدث المستخدم بلغة أخرى. كن ودوداً ومختصراً.";

        public ChatbotService(IConfiguration configuration)
        {
            _configuration = configuration;
            _httpClient = new HttpClient();
        }

        public async Task<string> GetResponseAsync(string message, List<ChatMessageDto> conversationHistory)
        {
            var apiKey = _configuration["Gemini:ApiKey"];

            if (string.IsNullOrWhiteSpace(apiKey))
                return "المساعد غير متاح حالياً. يرجى التواصل مع الدعم الفني.";

            // ── Build the Gemini `contents` array from conversation history ────
            // Gemini roles: "user" | "model"  (NOT "assistant")
            var contents = conversationHistory
                .Select(h => new
                {
                    role  = h.Role == "assistant" ? "model" : h.Role,
                    parts = new[] { new { text = h.Content } }
                })
                .ToList<object>();

            // Append the new user turn
            contents.Add(new
            {
                role  = "user",
                parts = new[] { new { text = message } }
            });

            // ── Gemini request body ────────────────────────────────────────────
            var requestBody = new
            {
                systemInstruction = new
                {
                    parts = new[] { new { text = SystemPrompt } }
                },
                contents,
                generationConfig = new
                {
                    maxOutputTokens = 1024,
                    temperature     = 0.7
                }
            };

            var json = JsonSerializer.Serialize(requestBody);

            // API key is passed as a query parameter — no Authorization header needed
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={apiKey}";

            var httpRequest = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };

            HttpResponseMessage response;
            try
            {
                response = await _httpClient.SendAsync(httpRequest);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ChatbotService] HTTP error: {ex.Message}");
                return "تعذّر الاتصال بالمساعد الذكي. حاول مرة أخرى.";
            }

            if (!response.IsSuccessStatusCode)
            {
                var errBody = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"[ChatbotService] Gemini error {response.StatusCode}: {errBody}");
                return "عذراً، لم أتمكن من الإجابة حالياً. حاول مرة أخرى.";
            }

            // ── Parse Gemini response ─────────────────────────────────────────
            // Shape: { candidates: [ { content: { parts: [ { text: "..." } ] } } ] }
            var responseJson = await response.Content.ReadAsStringAsync();

            try
            {
                using var doc = JsonDocument.Parse(responseJson);
                return doc.RootElement
                    .GetProperty("candidates")[0]
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text")
                    .GetString()
                    ?? "عذراً، لم أتمكن من الإجابة حالياً.";
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ChatbotService] Parse error: {ex.Message}\nRaw: {responseJson}");
                return "عذراً، حدث خطأ في معالجة الرد. حاول مرة أخرى.";
            }
        }
    }
}
