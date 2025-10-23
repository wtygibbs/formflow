using AcordParser.Core.Entities;

namespace AcordParser.Core.DTOs;

public record SubscriptionResponse(
    SubscriptionTier Tier,
    SubscriptionStatus Status,
    int DocumentsProcessedThisMonth,
    int DocumentLimit,
    DateTime? ExpiresAt,
    decimal? MonthlyPrice
);

public record CreateCheckoutSessionRequest(
    SubscriptionTier Tier
);

public record CreateCheckoutSessionResponse(
    string SessionId,
    string PublishableKey
);

public record SubscriptionTierInfo(
    SubscriptionTier Tier,
    string Name,
    int DocumentLimit,
    decimal MonthlyPrice,
    List<string> Features
);

public static class SubscriptionTiers
{
    public static readonly List<SubscriptionTierInfo> All = new()
    {
        new(SubscriptionTier.Free, "Free", 25, 0m, new List<string>
        {
            "25 documents per month",
            "Basic AI extraction",
            "CSV export",
            "Email support"
        }),
        new(SubscriptionTier.Starter, "Starter", 100, 29m, new List<string>
        {
            "100 documents per month",
            "Advanced AI extraction",
            "CSV export",
            "Priority email support",
            "2FA security"
        }),
        new(SubscriptionTier.Growth, "Growth", 500, 99m, new List<string>
        {
            "500 documents per month",
            "Advanced AI extraction",
            "CSV export",
            "Priority support",
            "2FA security",
            "API access"
        }),
        new(SubscriptionTier.Pro, "Pro", 2000, 299m, new List<string>
        {
            "2000 documents per month",
            "Advanced AI extraction",
            "CSV export",
            "Dedicated support",
            "2FA security",
            "API access",
            "Custom integrations"
        })
    };
}
