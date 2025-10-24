using AcordParser.Core.DTOs;

namespace AcordParser.Core.Interfaces;

public interface IAuthService
{
    Task<(bool Success, string? Error)> RegisterAsync(RegisterRequest request);
    Task<(bool Success, LoginResponse? Response, string? Error)> LoginAsync(LoginRequest request, string? ipAddress = null, string? deviceInfo = null);
    Task<(bool Success, RefreshTokenResponse? Response, string? Error)> RefreshTokenAsync(string refreshToken, string? ipAddress = null, string? deviceInfo = null);
    Task<(bool Success, string? Error)> RevokeTokenAsync(string refreshToken);
    Task<(bool Success, Enable2FAResponse? Response, string? Error)> Enable2FAAsync(string userId, string password);
    Task<(bool Success, string? Error)> Verify2FAAsync(string userId, string code);
    Task<(bool Success, string? Error)> Disable2FAAsync(string userId, string password);
    Task<(bool Success, string? Error)> ForgotPasswordAsync(ForgotPasswordRequest request);
    Task<(bool Success, string? Error)> ResetPasswordAsync(ResetPasswordRequest request);
    Task<(bool Success, string? Error)> ChangePasswordAsync(string userId, ChangePasswordRequest request);
    string GenerateJwtToken(string userId, string email);
}
