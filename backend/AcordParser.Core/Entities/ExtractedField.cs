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

    // Bounding box coordinates for document highlighting
    // Format: JSON array of polygons (one per page if multi-page)
    // Example: [{"page":1,"polygon":[x1,y1,x2,y2,x3,y3,x4,y4]}]
    public string? BoundingRegions { get; set; }

    // Page number where field appears (1-indexed)
    public int? PageNumber { get; set; }

    // Navigation properties
    public Document Document { get; set; } = null!;
}
