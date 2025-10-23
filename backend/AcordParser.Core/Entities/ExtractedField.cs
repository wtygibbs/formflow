namespace AcordParser.Core.Entities;

public class ExtractedField
{
    public Guid Id { get; set; }
    public Guid DocumentId { get; set; }
    public string FieldName { get; set; } = string.Empty;
    public string FieldValue { get; set; } = string.Empty;
    public float Confidence { get; set; }
    public bool IsVerified { get; set; }
    public DateTime ExtractedAt { get; set; } = DateTime.UtcNow;
    public DateTime? VerifiedAt { get; set; }
    public string? EditedValue { get; set; }

    // Navigation properties
    public Document Document { get; set; } = null!;
}
