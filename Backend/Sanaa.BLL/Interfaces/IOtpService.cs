using Sanaa.DAL.Entities;

namespace Sanaa.BLL.Interfaces
{
    public interface IOtpService
    {
        Task<bool> SendOtpAsync(string email, OtpPurpose purpose);
        Task<bool> VerifyOtpAsync(string email, string code, OtpPurpose purpose);
        Task<bool> ResetPasswordAsync(string email, string code, string newPassword);
    }
}
