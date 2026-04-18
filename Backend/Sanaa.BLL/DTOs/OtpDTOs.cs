namespace Sanaa.BLL.DTOs
{
    public class SendOtpRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Purpose { get; set; } = "EmailVerification";
    }

    public class VerifyOtpRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Purpose { get; set; } = "EmailVerification";
    }

    public class ForgotPasswordRequest
    {
        public string Email { get; set; } = string.Empty;
    }

    public class ResetPasswordRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}
