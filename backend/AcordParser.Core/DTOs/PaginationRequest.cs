namespace AcordParser.Core.DTOs;

public class PaginationRequest
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? Search { get; set; }
    public string? Status { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public string? SortBy { get; set; } = "UploadedAt";
    public string? SortOrder { get; set; } = "desc";

    // Advanced filters
    public double? MinConfidence { get; set; }
    public string? FileTypes { get; set; } // Comma-separated list (e.g., "PDF,PNG,JPG")
    public int? MinFieldCount { get; set; }
    public int? MaxFieldCount { get; set; }
}
