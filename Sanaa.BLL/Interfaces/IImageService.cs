using Microsoft.AspNetCore.Http;

namespace Sanaa.BLL.Interfaces;

public interface IImageService
{
    Task<string> UploadImageAsync(IFormFile file, string folderName);
}
