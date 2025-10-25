namespace AcordParser.Core.Entities;

public class Notification
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public NotificationType Type { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }
    public string? RelatedEntityId { get; set; } // Optional: link to document, subscription, etc.
    public string? ActionUrl { get; set; } // Optional: where to navigate when clicked

    // Navigation property
    public User User { get; set; } = null!;
}

public enum NotificationType
{
    Info = 0,
    Success = 1,
    Warning = 2,
    Error = 3,
    DocumentProcessing = 4,
    Subscription = 5,
    Security = 6
}
