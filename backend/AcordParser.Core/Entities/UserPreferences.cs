namespace AcordParser.Core.Entities;

public class UserPreferences
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Theme { get; set; } = "light"; // light, dark, system
    public bool EmailNotifications { get; set; } = true;
    public bool DocumentProcessingNotifications { get; set; } = true;
    public string DefaultExportFormat { get; set; } = "csv"; // csv, json, xml
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    public User User { get; set; } = null!;
}
