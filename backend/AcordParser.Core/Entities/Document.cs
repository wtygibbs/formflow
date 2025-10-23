namespace AcordParser.Core.Entities;

public class Document
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string BlobStorageUrl { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public DocumentStatus Status { get; set; } = DocumentStatus.Uploaded;
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }
    public string? ProcessingError { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;
    public ICollection<ExtractedField> ExtractedFields { get; set; } = new List<ExtractedField>();
}

public enum DocumentStatus
{
    Uploaded = 0,
    Processing = 1,
    Completed = 2,
    Failed = 3
}
