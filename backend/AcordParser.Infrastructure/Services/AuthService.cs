using AcordParser.Core.DTOs;
using AcordParser.Core.Entities;
using AcordParser.Core.Interfaces;
using AcordParser.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace AcordParser.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly UserManager<User> _userManager;
    private readonly IConfiguration _configuration;
    private readonly ApplicationDbContext _context;
    private readonly IEmailService _emailService;

    public AuthService(
        UserManager<User> userManager,
        IConfiguration configuration,
        ApplicationDbContext context,
        IEmailService emailService)
    {
        _userManager = userManager;
        _configuration = configuration;
        _context = context;
        _emailService = emailService;
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

    public async Task<(bool Success, LoginResponse? Response, string? Error)> LoginAsync(
        LoginRequest request,
        string? ipAddress = null,
        string? deviceInfo = null)
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

        // Generate tokens
        var accessToken = GenerateJwtToken(user.Id, user.Email!);
        var refreshToken = await GenerateRefreshTokenAsync(user.Id, ipAddress, deviceInfo);

        var response = new LoginResponse(accessToken, user.Email!, user.SubscriptionTier, RefreshToken: refreshToken);

        return (true, response, null);
    }

    public async Task<(bool Success, RefreshTokenResponse? Response, string? Error)> RefreshTokenAsync(
        string refreshToken,
        string? ipAddress = null,
        string? deviceInfo = null)
    {
        var token = await _context.RefreshTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == refreshToken);

        if (token == null || !token.IsActive)
        {
            return (false, null, "Invalid or expired refresh token");
        }

        // Replace old refresh token with new one (rotation)
        var newRefreshToken = await GenerateRefreshTokenAsync(token.UserId, ipAddress, deviceInfo);

        // Revoke old token
        token.IsRevoked = true;
        token.RevokedAt = DateTime.UtcNow;
        token.ReplacedByToken = newRefreshToken;
        await _context.SaveChangesAsync();

        // Generate new access token
        var newAccessToken = GenerateJwtToken(token.UserId, token.User.Email!);

        var response = new RefreshTokenResponse(newAccessToken, newRefreshToken);
        return (true, response, null);
    }

    public async Task<(bool Success, string? Error)> RevokeTokenAsync(string refreshToken)
    {
        var token = await _context.RefreshTokens
            .FirstOrDefaultAsync(t => t.Token == refreshToken);

        if (token == null || !token.IsActive)
        {
            return (false, "Invalid or already revoked token");
        }

        token.IsRevoked = true;
        token.RevokedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return (true, null);
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

    public async Task<(bool Success, string? Error)> ForgotPasswordAsync(ForgotPasswordRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            // Don't reveal that the user doesn't exist for security reasons
            return (true, null);
        }

        // Generate a secure random token
        var token = GenerateSecureToken();

        // Create password reset token entity
        var resetToken = new PasswordResetToken
        {
            UserId = user.Id,
            Token = token,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddHours(1), // Token expires in 1 hour
            IsUsed = false
        };

        _context.PasswordResetTokens.Add(resetToken);
        await _context.SaveChangesAsync();

        // Send password reset email
        var resetUrl = $"{_configuration["App:FrontendUrl"]}/reset-password?token={token}";
        var emailSubject = "Password Reset Request";
        var emailBody = $@"
            <h2>Password Reset Request</h2>
            <p>You have requested to reset your password for ACORD Parser.</p>
            <p>Click the link below to reset your password:</p>
            <p><a href=""{resetUrl}"">Reset Password</a></p>
            <p>This link will expire in 1 hour.</p>
            <p>If you did not request this, please ignore this email.</p>
        ";

        await _emailService.SendEmailAsync(user.Email!, emailSubject, emailBody);

        return (true, null);
    }

    public async Task<(bool Success, string? Error)> ResetPasswordAsync(ResetPasswordRequest request)
    {
        if (request.NewPassword != request.ConfirmPassword)
        {
            return (false, "Passwords do not match");
        }

        // Find the reset token
        var resetToken = await _context.PasswordResetTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == request.Token);

        if (resetToken == null)
        {
            return (false, "Invalid or expired reset token");
        }

        // Validate token
        if (resetToken.IsUsed)
        {
            return (false, "This reset token has already been used");
        }

        if (resetToken.ExpiresAt < DateTime.UtcNow)
        {
            return (false, "This reset token has expired");
        }

        // Reset the password
        var user = resetToken.User;
        var removePasswordResult = await _userManager.RemovePasswordAsync(user);
        if (!removePasswordResult.Succeeded)
        {
            return (false, "Failed to reset password");
        }

        var addPasswordResult = await _userManager.AddPasswordAsync(user, request.NewPassword);
        if (!addPasswordResult.Succeeded)
        {
            var errors = string.Join(", ", addPasswordResult.Errors.Select(e => e.Description));
            return (false, errors);
        }

        // Mark token as used
        resetToken.IsUsed = true;
        resetToken.UsedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return (true, null);
    }

    public async Task<(bool Success, string? Error)> ChangePasswordAsync(string userId, ChangePasswordRequest request)
    {
        if (request.NewPassword != request.ConfirmPassword)
        {
            return (false, "Passwords do not match");
        }

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return (false, "User not found");
        }

        var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            return (false, errors);
        }

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
            expires: DateTime.UtcNow.AddMinutes(15), // Short-lived access token (15 minutes)
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private string GenerateSecureToken()
    {
        // Generate a cryptographically secure random token
        var tokenBytes = new byte[32];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(tokenBytes);
        }
        return Convert.ToBase64String(tokenBytes).Replace("+", "-").Replace("/", "_").TrimEnd('=');
    }

    private async Task<string> GenerateRefreshTokenAsync(string userId, string? ipAddress = null, string? deviceInfo = null)
    {
        // Generate a cryptographically secure random token
        var tokenBytes = new byte[64];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(tokenBytes);
        }
        var token = Convert.ToBase64String(tokenBytes).Replace("+", "-").Replace("/", "_").TrimEnd('=');

        // Create refresh token entity
        var refreshToken = new RefreshToken
        {
            UserId = userId,
            Token = token,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(7), // Refresh token expires in 7 days
            IpAddress = ipAddress,
            DeviceInfo = deviceInfo
        };

        _context.RefreshTokens.Add(refreshToken);
        await _context.SaveChangesAsync();

        return token;
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
