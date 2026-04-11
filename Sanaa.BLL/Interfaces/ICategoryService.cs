using Sanaa.BLL.DTOs;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Sanaa.BLL.Interfaces
{
    public interface ICategoryService
    {
        Task<IEnumerable<CategoryResponseDto>> GetAllCategoriesAsync();
        Task<CategoryWithServicesDto> GetCategoryWithServicesAsync(int id);
        Task<bool> CreateCategoryAsync(CreateCategoryDto dto);
        Task<bool> UpdateCategoryAsync(int id, CreateCategoryDto dto);
        Task<bool> DeleteCategoryAsync(int id);
    }
}
