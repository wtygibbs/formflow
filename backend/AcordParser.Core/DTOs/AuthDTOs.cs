using AcordParser.Core.Entities;

namespace AcordParser.Core.DTOs;

public record RegisterRequest(
    string Email,
    string Password,
    string ConfirmPassword
);

public record LoginRequest(
    string Email,
    string Password,
    string? TwoFactorCode = null
);

public record LoginResponse(
    string Token,
    string Email,
    SubscriptionTier SubscriptionTier,
    bool TwoFactorRequired = false,
    string? RefreshToken = null
);

public record RefreshTokenResponse(
    string Token,
    string RefreshToken
);

public record Enable2FARequest(
    string Password
);

public record Enable2FAResponse(
    string Secret,
    string QrCodeUrl
);

public record Verify2FARequest(
    string Code
);

public record ForgotPasswordRequest(
    string Email
);

public record ResetPasswordRequest(
    string Token,
    string NewPassword,
    string ConfirmPassword
);

public record ChangePasswordRequest(
    string CurrentPassword,
    string NewPassword,
    string ConfirmPassword
);
