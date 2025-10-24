using Microsoft.AspNetCore.Identity;

namespace AcordParser.Core.Entities;

public class User : IdentityUser
{
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }
    public string? SubscriptionId { get; set; }
    public SubscriptionTier SubscriptionTier { get; set; } = SubscriptionTier.Free;
    public DateTime? SubscriptionExpiresAt { get; set; }
    public int DocumentsProcessedThisMonth { get; set; }
    public bool TwoFactorEnabled { get; set; }
    public string? TwoFactorSecret { get; set; }
    public string? ProfilePictureUrl { get; set; }
    public string? DisplayName { get; set; }

    // Navigation properties
    public ICollection<Document> Documents { get; set; } = new List<Document>();
    public UserPreferences? Preferences { get; set; }
}

public enum SubscriptionTier
{
    Free = 0,
    Starter = 1,
    Growth = 2,
    Pro = 3
}
