namespace AcordParser.Core.Entities;

public class Subscription
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string StripeCustomerId { get; set; } = string.Empty;
    public string StripeSubscriptionId { get; set; } = string.Empty;
    public SubscriptionTier Tier { get; set; }
    public SubscriptionStatus Status { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime? CancelledAt { get; set; }
    public int DocumentLimit { get; set; }
    public decimal MonthlyPrice { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;
}

public enum SubscriptionStatus
{
    Active = 0,
    Cancelled = 1,
    PastDue = 2,
    Expired = 3
}
