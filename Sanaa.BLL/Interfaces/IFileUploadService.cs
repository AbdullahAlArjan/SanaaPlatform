using Microsoft.AspNetCore.Http;

namespace Sanaa.BLL.Interfaces
{
    public interface IFileUploadService
    {
        Task<string> SaveImageAsync(IFormFile file, string folder);
        void DeleteImage(string imageUrl);
    }
}
