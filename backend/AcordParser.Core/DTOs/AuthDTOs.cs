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
    bool TwoFactorRequired = false
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
