using AcordParser.Core.DTOs;

namespace AcordParser.Core.Interfaces;

public interface IAuthService
{
    Task<(bool Success, string? Error)> RegisterAsync(RegisterRequest request);
    Task<(bool Success, LoginResponse? Response, string? Error)> LoginAsync(LoginRequest request);
    Task<(bool Success, Enable2FAResponse? Response, string? Error)> Enable2FAAsync(string userId, string password);
    Task<(bool Success, string? Error)> Verify2FAAsync(string userId, string code);
    Task<(bool Success, string? Error)> Disable2FAAsync(string userId, string password);
    string GenerateJwtToken(string userId, string email);
}
