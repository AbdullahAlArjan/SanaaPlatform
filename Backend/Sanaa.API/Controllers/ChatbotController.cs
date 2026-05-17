using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Text.Json;

namespace Sanaa.API.Controllers
{
    [ApiController]
    [Route("api/chatbot")]
    public class ChatbotController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;

        private const string SystemContext =
            "أنت المساعد الذكي الرسمي لمنصة 'صنعة' (Sanaa Platform). " +
            "منصة صنعة هي سوق عمل حر يربط بين العملاء والصنايعية أو المستقلين (Freelancers) " +
            "في الأردن لتقديم خدمات احترافية. " +
            "أجب على أسئلة المستخدمين بلهجة أردنية/عربية ودودة، محترفة ومختصرة. " +
            "ساعدهم في فهم كيف يطلبون خدمات أو كيف يعرضون خدماتهم. " +
            "لا تخترع أسعاراً أو تفاصيل غير موجودة.";

        public ChatbotController(IConfiguration configuration, IHttpClientFactory httpClientFactory)
        {
            _configuration    = configuration;
            _httpClientFactory = httpClientFactory;
        }

        // POST /api/chatbot/ask
        [HttpPost("ask")]
        public async Task<IActionResult> Ask([FromBody] ChatRequest request)
        {
            if (string.IsNullOrEmpty(request?.Message))
                return BadRequest(new { response = "الرسالة فارغة" });

            var apiKey = _configuration["Gemini:ApiKey"];

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                Console.Error.WriteLine("[Chatbot] Gemini:ApiKey is missing from appsettings.json");
                return StatusCode(500, new { response = "مفتاح الذكاء الاصطناعي غير مضبوط. تواصل مع الدعم الفني." });
            }

            // Gemini endpoint — gemini-1.5-flash supports Arabic well
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={apiKey}";

            // Payload: inject system context as the first user turn, then the real message.
            // Gemini does not have a dedicated system field in gemini-1.5-flash; prepending context
            // as the opening user turn is the recommended pattern.
            var payload = new
            {
                contents = new[]
                {
                    new
                    {
                        role  = "user",
                        parts = new[] { new { text = SystemContext } }
                    },
                    new
                    {
                        role  = "model",
                        parts = new[] { new { text = "مرحباً! أنا صنّاع، مساعدك الذكي في منصة صنعة. كيف أقدر أساعدك اليوم؟" } }
                    },
                    new
                    {
                        role  = "user",
                        parts = new[] { new { text = request.Message } }
                    }
                },
                generationConfig = new
                {
                    maxOutputTokens = 512,
                    temperature     = 0.7
                }
            };

            try
            {
                var client  = _httpClientFactory.CreateClient();
                var json    = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                Console.WriteLine($"[Chatbot] Sending to Gemini: {request.Message}");

                var httpResponse = await client.PostAsync(url, content);
                var rawBody      = await httpResponse.Content.ReadAsStringAsync();

                Console.WriteLine($"[Chatbot] Gemini status: {(int)httpResponse.StatusCode}");
                Console.WriteLine($"[Chatbot] Gemini raw response: {rawBody}");

                if (!httpResponse.IsSuccessStatusCode)
                {
                    Console.Error.WriteLine($"[Chatbot] Gemini API error {(int)httpResponse.StatusCode}: {rawBody}");
                    return StatusCode(502, new { response = $"خطأ من Gemini API ({(int)httpResponse.StatusCode}). تحقق من مفتاح API أو حاول لاحقاً." });
                }

                // Parse: candidates[0].content.parts[0].text
                using var doc = JsonDocument.Parse(rawBody);
                var geminiReply = doc.RootElement
                    .GetProperty("candidates")[0]
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text")
                    .GetString();

                if (string.IsNullOrWhiteSpace(geminiReply))
                {
                    Console.Error.WriteLine("[Chatbot] Gemini returned an empty reply.");
                    return Ok(new { response = "وصل الرد فارغاً من الذكاء الاصطناعي. حاول مرة أخرى." });
                }

                Console.WriteLine($"[Chatbot] Gemini reply: {geminiReply}");
                return Ok(new { response = geminiReply });
            }
            catch (JsonException jsonEx)
            {
                Console.Error.WriteLine($"[Chatbot] JSON parse error: {jsonEx.Message}");
                return StatusCode(500, new { response = "خطأ في قراءة رد الذكاء الاصطناعي." });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[Chatbot] Unexpected error: {ex.Message}");
                return StatusCode(500, new { response = $"خطأ داخلي: {ex.Message}" });
            }
        }
    }

    public class ChatRequest
    {
        public string Message { get; set; } = string.Empty;
    }
}
