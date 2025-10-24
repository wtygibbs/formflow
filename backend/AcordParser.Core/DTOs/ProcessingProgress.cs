namespace AcordParser.Core.DTOs;

public class ProcessingProgress
{
    public Guid DocumentId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int PercentComplete { get; set; }
    public string CurrentStep { get; set; } = string.Empty;
    public int? EstimatedSecondsRemaining { get; set; }
    public int TotalFields { get; set; }
    public int ProcessedFields { get; set; }
}
