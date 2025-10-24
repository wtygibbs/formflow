namespace AcordParser.Core.DTOs;

public class DashboardMetrics
{
    public DocumentStats DocumentStats { get; set; } = new();
    public ProcessingStats ProcessingStats { get; set; } = new();
    public QualityMetrics QualityMetrics { get; set; } = new();
    public List<ProcessingTrend> ProcessingTrends { get; set; } = new();
    public List<StatusBreakdown> StatusBreakdown { get; set; } = new();
}

public class DocumentStats
{
    public int TotalDocuments { get; set; }
    public int CompletedDocuments { get; set; }
    public int ProcessingDocuments { get; set; }
    public int FailedDocuments { get; set; }
    public int UploadedDocuments { get; set; }
}

public class ProcessingStats
{
    public double AverageProcessingTimeSeconds { get; set; }
    public double SuccessRate { get; set; }
    public int TotalFieldsExtracted { get; set; }
    public int DocumentsProcessedToday { get; set; }
    public int DocumentsProcessedThisWeek { get; set; }
    public int DocumentsProcessedThisMonth { get; set; }
}

public class QualityMetrics
{
    public double AverageConfidence { get; set; }
    public int HighConfidenceFields { get; set; }
    public int MediumConfidenceFields { get; set; }
    public int LowConfidenceFields { get; set; }
    public int VerifiedFields { get; set; }
    public double VerificationRate { get; set; }
}

public class ProcessingTrend
{
    public DateTime Date { get; set; }
    public int DocumentsProcessed { get; set; }
    public int SuccessfulDocuments { get; set; }
    public int FailedDocuments { get; set; }
}

public class StatusBreakdown
{
    public string Status { get; set; } = string.Empty;
    public int Count { get; set; }
    public double Percentage { get; set; }
}
