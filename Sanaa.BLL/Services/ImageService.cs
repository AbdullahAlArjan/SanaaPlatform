using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Sanaa.BLL.Interfaces;

namespace Sanaa.BLL.Services;

public class ImageService : IImageService
{
    private readonly IWebHostEnvironment _env;

    public ImageService(IWebHostEnvironment env)
    {
        _env = env;
    }

    public async Task<string> UploadImageAsync(IFormFile file, string folderName)
    {
        if (file == null || file.Length == 0)
            throw new ArgumentException("لم يتم اختيار أي ملف.");

        if (file.Length > 5 * 1024 * 1024)
            throw new ArgumentException("حجم الملف يتجاوز الحد الأقصى المسموح به (5 MB).");

        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png" };
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(extension))
            throw new ArgumentException("نوع الملف غير مسموح. يُسمح فقط بـ .jpg, .jpeg, .png");

        var uploadsFolder = Path.Combine(_env.WebRootPath, "images", folderName);
        Directory.CreateDirectory(uploadsFolder);

        var uniqueFileName = $"{Guid.NewGuid()}{extension}";
        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

        using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        return $"/images/{folderName}/{uniqueFileName}";
    }
}
