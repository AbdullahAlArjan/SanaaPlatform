using Microsoft.AspNetCore.Http;

namespace Sanaa.API.DTOs
{
    public class UploadImageRequest
    {
        public IFormFile File { get; set; }
    }
}
