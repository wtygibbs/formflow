using AcordParser.Core.DTOs;
using AcordParser.Core.Entities;
using AcordParser.Core.Interfaces;
using AcordParser.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Stripe;
using Stripe.Checkout;

namespace AcordParser.Infrastructure.Services;

public class SubscriptionService : ISubscriptionService
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<User> _userManager;
    private readonly IConfiguration _configuration;
    private readonly string _stripeSecretKey;
    private readonly string _stripePublishableKey;
    private readonly string _webhookSecret;

    private static readonly Dictionary<SubscriptionTier, string> StripePriceIds = new()
    {
        { SubscriptionTier.Starter, "price_starter" }, // Replace with actual Stripe price IDs
        { SubscriptionTier.Growth, "price_growth" },
        { SubscriptionTier.Pro, "price_pro" }
    };

    public SubscriptionService(
        ApplicationDbContext context,
        UserManager<User> userManager,
        IConfiguration configuration)
    {
        _context = context;
        _userManager = userManager;
        _configuration = configuration;

        _stripeSecretKey = configuration["Stripe:SecretKey"] ?? throw new InvalidOperationException("Stripe secret key not configured");
        _stripePublishableKey = configuration["Stripe:PublishableKey"] ?? throw new InvalidOperationException("Stripe publishable key not configured");
        _webhookSecret = configuration["Stripe:WebhookSecret"] ?? "";

        StripeConfiguration.ApiKey = _stripeSecretKey;
    }

    public async Task<SubscriptionResponse> GetUserSubscriptionAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            throw new ArgumentException("User not found");
        }

        var subscription = await _context.Subscriptions
            .FirstOrDefaultAsync(s => s.UserId == userId);

        var tierInfo = SubscriptionTiers.All.First(t => t.Tier == user.SubscriptionTier);

        return new SubscriptionResponse(
            user.SubscriptionTier,
            subscription?.Status ?? Core.Entities.SubscriptionStatus.Active,
            user.DocumentsProcessedThisMonth,
            tierInfo.DocumentLimit,
            user.SubscriptionExpiresAt,
            subscription?.MonthlyPrice
        );
    }

    public async Task<CreateCheckoutSessionResponse> CreateCheckoutSessionAsync(string userId, SubscriptionTier tier)
    {
        if (tier == SubscriptionTier.Free)
        {
            throw new ArgumentException("Cannot create checkout session for free tier");
        }

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            throw new ArgumentException("User not found");
        }

        if (!StripePriceIds.TryGetValue(tier, out var priceId))
        {
            throw new ArgumentException("Invalid subscription tier");
        }

        var options = new SessionCreateOptions
        {
            PaymentMethodTypes = new List<string> { "card" },
            LineItems = new List<SessionLineItemOptions>
            {
                new SessionLineItemOptions
                {
                    Price = priceId,
                    Quantity = 1,
                }
            },
            Mode = "subscription",
            SuccessUrl = $"{_configuration["App:BaseUrl"]}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}",
            CancelUrl = $"{_configuration["App:BaseUrl"]}/subscription/cancel",
            CustomerEmail = user.Email,
            ClientReferenceId = userId,
            Metadata = new Dictionary<string, string>
            {
                { "user_id", userId },
                { "tier", tier.ToString() }
            }
        };

        var service = new SessionService();
        var session = await service.CreateAsync(options);

        return new CreateCheckoutSessionResponse(session.Id, _stripePublishableKey);
    }

    public async Task<bool> HandleWebhookAsync(string payload, string signature)
    {
        try
        {
            var stripeEvent = EventUtility.ConstructEvent(payload, signature, _webhookSecret);

            switch (stripeEvent.Type)
            {
                case Events.CheckoutSessionCompleted:
                    await HandleCheckoutSessionCompletedAsync(stripeEvent);
                    break;

                case Events.CustomerSubscriptionUpdated:
                    await HandleSubscriptionUpdatedAsync(stripeEvent);
                    break;

                case Events.CustomerSubscriptionDeleted:
                    await HandleSubscriptionDeletedAsync(stripeEvent);
                    break;
            }

            return true;
        }
        catch (Exception)
        {
            return false;
        }
    }

    public async Task<bool> CancelSubscriptionAsync(string userId)
    {
        var subscription = await _context.Subscriptions
            .FirstOrDefaultAsync(s => s.UserId == userId && s.Status == Core.Entities.SubscriptionStatus.Active);

        if (subscription == null)
        {
            return false;
        }

        var service = new Stripe.SubscriptionService();
        await service.CancelAsync(subscription.StripeSubscriptionId);

        subscription.Status = Core.Entities.SubscriptionStatus.Cancelled;
        subscription.CancelledAt = DateTime.UtcNow;

        var user = await _userManager.FindByIdAsync(userId);
        if (user != null)
        {
            user.SubscriptionTier = SubscriptionTier.Free;
            await _userManager.UpdateAsync(user);
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> CanProcessDocumentAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return false;
        }

        var tierInfo = SubscriptionTiers.All.First(t => t.Tier == user.SubscriptionTier);
        return user.DocumentsProcessedThisMonth < tierInfo.DocumentLimit;
    }

    public async Task IncrementDocumentCountAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user != null)
        {
            user.DocumentsProcessedThisMonth++;
            await _userManager.UpdateAsync(user);
        }
    }

    public List<SubscriptionTierInfo> GetAvailableTiers()
    {
        return SubscriptionTiers.All;
    }

    private async Task HandleCheckoutSessionCompletedAsync(Event stripeEvent)
    {
        var session = stripeEvent.Data.Object as Session;
        if (session == null) return;

        var userId = session.Metadata["user_id"];
        var tier = Enum.Parse<SubscriptionTier>(session.Metadata["tier"]);

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null) return;

        var tierInfo = SubscriptionTiers.All.First(t => t.Tier == tier);

        var subscription = new Core.Entities.Subscription
        {
            UserId = userId,
            StripeCustomerId = session.CustomerId,
            StripeSubscriptionId = session.SubscriptionId,
            Tier = tier,
            Status = Core.Entities.SubscriptionStatus.Active,
            StartDate = DateTime.UtcNow,
            DocumentLimit = tierInfo.DocumentLimit,
            MonthlyPrice = tierInfo.MonthlyPrice
        };

        _context.Subscriptions.Add(subscription);

        user.SubscriptionTier = tier;
        user.SubscriptionId = session.SubscriptionId;
        user.SubscriptionExpiresAt = DateTime.UtcNow.AddMonths(1);

        await _userManager.UpdateAsync(user);
        await _context.SaveChangesAsync();
    }

    private async Task HandleSubscriptionUpdatedAsync(Event stripeEvent)
    {
        var stripeSubscription = stripeEvent.Data.Object as Stripe.Subscription;
        if (stripeSubscription == null) return;

        var subscription = await _context.Subscriptions
            .FirstOrDefaultAsync(s => s.StripeSubscriptionId == stripeSubscription.Id);

        if (subscription != null)
        {
            subscription.Status = stripeSubscription.Status switch
            {
                "active" => Core.Entities.SubscriptionStatus.Active,
                "past_due" => Core.Entities.SubscriptionStatus.PastDue,
                "canceled" => Core.Entities.SubscriptionStatus.Cancelled,
                _ => subscription.Status
            };

            await _context.SaveChangesAsync();
        }
    }

    private async Task HandleSubscriptionDeletedAsync(Event stripeEvent)
    {
        var stripeSubscription = stripeEvent.Data.Object as Stripe.Subscription;
        if (stripeSubscription == null) return;

        var subscription = await _context.Subscriptions
            .FirstOrDefaultAsync(s => s.StripeSubscriptionId == stripeSubscription.Id);

        if (subscription != null)
        {
            subscription.Status = Core.Entities.SubscriptionStatus.Expired;
            subscription.EndDate = DateTime.UtcNow;

            var user = await _userManager.FindByIdAsync(subscription.UserId);
            if (user != null)
            {
                user.SubscriptionTier = SubscriptionTier.Free;
                await _userManager.UpdateAsync(user);
            }

            await _context.SaveChangesAsync();
        }
    }
}
