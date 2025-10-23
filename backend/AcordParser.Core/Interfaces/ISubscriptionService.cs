using AcordParser.Core.DTOs;
using AcordParser.Core.Entities;

namespace AcordParser.Core.Interfaces;

public interface ISubscriptionService
{
    Task<SubscriptionResponse> GetUserSubscriptionAsync(string userId);
    Task<CreateCheckoutSessionResponse> CreateCheckoutSessionAsync(string userId, SubscriptionTier tier);
    Task<bool> HandleWebhookAsync(string payload, string signature);
    Task<bool> CancelSubscriptionAsync(string userId);
    Task<bool> CanProcessDocumentAsync(string userId);
    Task IncrementDocumentCountAsync(string userId);
    List<SubscriptionTierInfo> GetAvailableTiers();
}
