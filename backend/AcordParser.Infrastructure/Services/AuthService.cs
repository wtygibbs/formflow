using AcordParser.Core.DTOs;
using AcordParser.Core.Entities;
using AcordParser.Core.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace AcordParser.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly UserManager<User> _userManager;
    private readonly IConfiguration _configuration;

    public AuthService(UserManager<User> userManager, IConfiguration configuration)
    {
        _userManager = userManager;
        _configuration = configuration;
    }

    public async Task<(bool Success, string? Error)> RegisterAsync(RegisterRequest request)
    {
        if (request.Password != request.ConfirmPassword)
        {
            return (false, "Passwords do not match");
        }

        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser != null)
        {
            return (false, "Email already registered");
        }

        var user = new User
        {
            UserName = request.Email,
            Email = request.Email,
            EmailConfirmed = true, // For simplicity, auto-confirm
            SubscriptionTier = SubscriptionTier.Free,
            CreatedAt = DateTime.UtcNow
        };

        var result = await _userManager.CreateAsync(user, request.Password);

        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            return (false, errors);
        }

        return (true, null);
    }

    public async Task<(bool Success, LoginResponse? Response, string? Error)> LoginAsync(LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            return (false, null, "Invalid credentials");
        }

        var passwordValid = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!passwordValid)
        {
            return (false, null, "Invalid credentials");
        }

        // Check if 2FA is enabled
        if (user.TwoFactorEnabled)
        {
            if (string.IsNullOrEmpty(request.TwoFactorCode))
            {
                return (true, new LoginResponse("", user.Email!, user.SubscriptionTier, TwoFactorRequired: true), null);
            }

            var isValid = VerifyTwoFactorCode(user.TwoFactorSecret!, request.TwoFactorCode);
            if (!isValid)
            {
                return (false, null, "Invalid two-factor code");
            }
        }

        // Update last login
        user.LastLoginAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        var token = GenerateJwtToken(user.Id, user.Email!);
        var response = new LoginResponse(token, user.Email!, user.SubscriptionTier);

        return (true, response, null);
    }

    public async Task<(bool Success, Enable2FAResponse? Response, string? Error)> Enable2FAAsync(string userId, string password)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return (false, null, "User not found");
        }

        var passwordValid = await _userManager.CheckPasswordAsync(user, password);
        if (!passwordValid)
        {
            return (false, null, "Invalid password");
        }

        // Generate 2FA secret
        var secret = GenerateTwoFactorSecret();
        user.TwoFactorSecret = secret;
        user.TwoFactorEnabled = false; // Will be enabled after verification

        await _userManager.UpdateAsync(user);

        var qrCodeUrl = GenerateQrCodeUrl(user.Email!, secret);
        var response = new Enable2FAResponse(secret, qrCodeUrl);

        return (true, response, null);
    }

    public async Task<(bool Success, string? Error)> Verify2FAAsync(string userId, string code)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null || user.TwoFactorSecret == null)
        {
            return (false, "Invalid request");
        }

        var isValid = VerifyTwoFactorCode(user.TwoFactorSecret, code);
        if (!isValid)
        {
            return (false, "Invalid code");
        }

        user.TwoFactorEnabled = true;
        await _userManager.UpdateAsync(user);

        return (true, null);
    }

    public async Task<(bool Success, string? Error)> Disable2FAAsync(string userId, string password)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return (false, "User not found");
        }

        var passwordValid = await _userManager.CheckPasswordAsync(user, password);
        if (!passwordValid)
        {
            return (false, "Invalid password");
        }

        user.TwoFactorEnabled = false;
        user.TwoFactorSecret = null;
        await _userManager.UpdateAsync(user);

        return (true, null);
    }

    public string GenerateJwtToken(string userId, string email)
    {
        var jwtKey = _configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured");
        var jwtIssuer = _configuration["Jwt:Issuer"] ?? "AcordParser";
        var jwtAudience = _configuration["Jwt:Audience"] ?? "AcordParserAPI";

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private string GenerateTwoFactorSecret()
    {
        var random = new Random();
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        return new string(Enumerable.Repeat(chars, 32)
            .Select(s => s[random.Next(s.Length)]).ToArray());
    }

    private string GenerateQrCodeUrl(string email, string secret)
    {
        var appName = "AcordParser";
        var totpUri = $"otpauth://totp/{appName}:{email}?secret={secret}&issuer={appName}";
        return $"https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl={Uri.EscapeDataString(totpUri)}";
    }

    private bool VerifyTwoFactorCode(string secret, string code)
    {
        // Simple TOTP verification (in production, use a library like OtpNet)
        // This is a simplified implementation
        var unixTimestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var timeStep = unixTimestamp / 30;

        // Check current time step and adjacent ones (to account for time drift)
        for (int i = -1; i <= 1; i++)
        {
            var expectedCode = GenerateTotpCode(secret, timeStep + i);
            if (expectedCode == code)
            {
                return true;
            }
        }

        return false;
    }

    private string GenerateTotpCode(string secret, long timeStep)
    {
        // Simplified TOTP generation
        // In production, use a proper library
        var hash = timeStep.GetHashCode() ^ secret.GetHashCode();
        var code = Math.Abs(hash) % 1000000;
        return code.ToString("D6");
    }
}
