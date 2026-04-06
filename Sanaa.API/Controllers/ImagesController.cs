using Microsoft.AspNetCore.Mvc;
using Sanaa.BLL.Interfaces;

namespace Sanaa.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class ImagesController : ControllerBase
{
    private readonly IImageService _imageService;

    public ImagesController(IImageService imageService)
    {
        _imageService = imageService;
    }

    [HttpPost("upload-profile")]
    public async Task<IActionResult> UploadProfileImage(IFormFile file)
    {
        try
        {
            var url = await _imageService.UploadImageAsync(file, "profiles");
            return Ok(new { url });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
