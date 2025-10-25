using AcordParser.Core.DTOs;
using AcordParser.Core.Entities;
using AcordParser.Core.Interfaces;
using AcordParser.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Text;

namespace AcordParser.Infrastructure.Services;

public class DocumentService : IDocumentService
{
    private readonly ApplicationDbContext _context;
    private readonly IBlobStorageService _blobStorage;
    private readonly IAzureDocumentIntelligenceService _documentIntelligence;
    private readonly ISubscriptionService _subscriptionService;
    private readonly INotificationService? _notificationService;
    private readonly IBackgroundTaskQueue? _backgroundTaskQueue;

    private static readonly string[] AllowedExtensions = { ".pdf", ".png", ".jpg", ".jpeg", ".tiff" };
    private const long MaxFileSize = 10 * 1024 * 1024; // 10MB

    public DocumentService(
        ApplicationDbContext context,
        IBlobStorageService blobStorage,
        IAzureDocumentIntelligenceService documentIntelligence,
        ISubscriptionService subscriptionService,
        INotificationService? notificationService = null,
        IBackgroundTaskQueue? backgroundTaskQueue = null)
    {
        _context = context;
        _blobStorage = blobStorage;
        _documentIntelligence = documentIntelligence;
        _subscriptionService = subscriptionService;
        _notificationService = notificationService;
        _backgroundTaskQueue = backgroundTaskQueue;
    }

    public async Task<UploadDocumentResponse> UploadDocumentAsync(string userId, IFormFile file)
    {
        // Validate file
        if (file == null || file.Length == 0)
        {
            throw new ArgumentException("File is empty");
        }

        if (file.Length > MaxFileSize)
        {
            throw new ArgumentException($"File size exceeds maximum allowed size of {MaxFileSize / 1024 / 1024}MB");
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(extension))
        {
            throw new ArgumentException($"File type not allowed. Allowed types: {string.Join(", ", AllowedExtensions)}");
        }

        // Check subscription limits
        var canProcess = await _subscriptionService.CanProcessDocumentAsync(userId);
        if (!canProcess)
        {
            throw new InvalidOperationException("Document limit reached for current subscription tier");
        }

        // Upload to blob storage
        string blobUrl;
        using (var stream = file.OpenReadStream())
        {
            blobUrl = await _blobStorage.UploadFileAsync(stream, file.FileName, file.ContentType);
        }

        // Create document record
        var document = new Document
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            FileName = file.FileName,
            BlobStorageUrl = blobUrl,
            FileSizeBytes = file.Length,
            Status = DocumentStatus.Uploaded,
            UploadedAt = DateTime.UtcNow
        };

        _context.Documents.Add(document);
        await _context.SaveChangesAsync();

        // Enqueue document for background processing
        if (_backgroundTaskQueue != null)
        {
            await _backgroundTaskQueue.QueueDocumentAsync(document.Id);
        }
        else
        {
            // Fallback: Process synchronously if queue is not available (e.g., in tests)
            await ProcessDocumentAsync(document.Id);
        }

        return new UploadDocumentResponse(document.Id, document.FileName, document.Status);
    }

    public async Task<List<DocumentListResponse>> GetUserDocumentsAsync(string userId)
    {
        var documents = await _context.Documents
            .Where(d => d.UserId == userId)
            .OrderByDescending(d => d.UploadedAt)
            .Select(d => new DocumentListResponse(
                d.Id,
                d.FileName,
                d.Status,
                d.UploadedAt,
                d.ProcessedAt,
                d.ExtractedFields.Count
            ))
            .ToListAsync();

        return documents;
    }

    public async Task<PaginatedResponse<DocumentListResponse>> GetUserDocumentsPaginatedAsync(string userId, PaginationRequest request)
    {
        // Build base query
        var query = _context.Documents
            .Where(d => d.UserId == userId)
            .AsQueryable();

        // Apply search filter
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var searchTerm = request.Search.ToLower();
            query = query.Where(d => d.FileName.ToLower().Contains(searchTerm));
        }

        // Apply status filter
        if (!string.IsNullOrWhiteSpace(request.Status) && Enum.TryParse<DocumentStatus>(request.Status, true, out var status))
        {
            query = query.Where(d => d.Status == status);
        }

        // Apply date range filters
        if (request.FromDate.HasValue)
        {
            query = query.Where(d => d.UploadedAt >= request.FromDate.Value);
        }

        if (request.ToDate.HasValue)
        {
            var toDateEndOfDay = request.ToDate.Value.Date.AddDays(1).AddTicks(-1);
            query = query.Where(d => d.UploadedAt <= toDateEndOfDay);
        }

        // Apply advanced filters
        if (request.MinConfidence.HasValue)
        {
            // Filter documents where average field confidence >= minConfidence
            query = query.Where(d => d.ExtractedFields.Any() &&
                d.ExtractedFields.Average(f => f.Confidence) >= request.MinConfidence.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.FileTypes))
        {
            // Parse comma-separated file types (e.g., "PDF,PNG,JPG")
            var fileTypes = request.FileTypes.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(ft => "." + ft.Trim().ToUpper())
                .ToList();

            if (fileTypes.Any())
            {
                query = query.Where(d => fileTypes.Any(ft => d.FileName.ToUpper().EndsWith(ft)));
            }
        }

        if (request.MinFieldCount.HasValue)
        {
            query = query.Where(d => d.ExtractedFields.Count >= request.MinFieldCount.Value);
        }

        if (request.MaxFieldCount.HasValue)
        {
            query = query.Where(d => d.ExtractedFields.Count <= request.MaxFieldCount.Value);
        }

        // Get total count before pagination
        var totalCount = await query.CountAsync();

        // Apply sorting
        query = (request.SortBy?.ToLower(), request.SortOrder?.ToLower()) switch
        {
            ("filename", "asc") => query.OrderBy(d => d.FileName),
            ("filename", "desc") => query.OrderByDescending(d => d.FileName),
            ("status", "asc") => query.OrderBy(d => d.Status),
            ("status", "desc") => query.OrderByDescending(d => d.Status),
            ("uploadedat", "asc") => query.OrderBy(d => d.UploadedAt),
            ("processedat", "asc") => query.OrderBy(d => d.ProcessedAt),
            ("processedat", "desc") => query.OrderByDescending(d => d.ProcessedAt),
            _ => query.OrderByDescending(d => d.UploadedAt) // Default sort
        };

        // Apply pagination
        var documents = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(d => new DocumentListResponse(
                d.Id,
                d.FileName,
                d.Status,
                d.UploadedAt,
                d.ProcessedAt,
                d.ExtractedFields.Count
            ))
            .ToListAsync();

        // Calculate pagination metadata
        var totalPages = (int)Math.Ceiling(totalCount / (double)request.PageSize);

        return new PaginatedResponse<DocumentListResponse>
        {
            Data = documents,
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalPages = totalPages,
            HasPreviousPage = request.Page > 1,
            HasNextPage = request.Page < totalPages
        };
    }

    public async Task<DocumentDetailResponse?> GetDocumentDetailAsync(Guid documentId, string userId)
    {
        var document = await _context.Documents
            .Include(d => d.ExtractedFields)
            .FirstOrDefaultAsync(d => d.Id == documentId && d.UserId == userId);

        if (document == null)
        {
            return null;
        }

        var fields = document.ExtractedFields
            .Select(f => new ExtractedFieldDTO(
                f.Id,
                f.FieldName,
                f.FieldValue,
                f.Confidence,
                f.IsVerified,
                f.EditedValue,
                f.BoundingRegions,
                f.PageNumber
            ))
            .ToList();

        // Generate SAS URL for temporary access to the blob (valid for 1 hour)
        string? fileUrl = null;
        if (!string.IsNullOrEmpty(document.BlobStorageUrl))
        {
            try
            {
                fileUrl = _blobStorage.GenerateSasUrl(document.BlobStorageUrl, expiryMinutes: 60);
            }
            catch (Exception ex)
            {
                // Log the error but don't fail the request
                // The file preview just won't be available
                Console.WriteLine($"Failed to generate SAS URL: {ex.Message}");
            }
        }

        return new DocumentDetailResponse(
            document.Id,
            document.FileName,
            fileUrl,
            document.Status,
            document.UploadedAt,
            document.ProcessedAt,
            document.ProcessingError,
            fields
        );
    }

    public async Task<bool> UpdateExtractedFieldAsync(Guid fieldId, string userId, UpdateFieldRequest request)
    {
        var field = await _context.ExtractedFields
            .Include(f => f.Document)
            .FirstOrDefaultAsync(f => f.Id == fieldId && f.Document.UserId == userId);

        if (field == null)
        {
            return false;
        }

        field.EditedValue = request.EditedValue;
        field.IsVerified = request.IsVerified;

        if (request.IsVerified)
        {
            field.VerifiedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<byte[]> ExportToCsvAsync(Guid documentId, string userId)
    {
        var document = await _context.Documents
            .Include(d => d.ExtractedFields)
            .FirstOrDefaultAsync(d => d.Id == documentId && d.UserId == userId);

        if (document == null)
        {
            throw new ArgumentException("Document not found");
        }

        var csv = new StringBuilder();
        csv.AppendLine("Field Name,Original Value,Edited Value,Confidence,Verified,Extracted At");

        foreach (var field in document.ExtractedFields.OrderBy(f => f.FieldName))
        {
            var editedValue = field.EditedValue ?? field.FieldValue;
            csv.AppendLine($"\"{field.FieldName}\",\"{field.FieldValue}\",\"{editedValue}\",{field.Confidence},{field.IsVerified},{field.ExtractedAt:yyyy-MM-dd HH:mm:ss}");
        }

        return Encoding.UTF8.GetBytes(csv.ToString());
    }

    public async Task ProcessDocumentAsync(Guid documentId)
    {
        var document = await _context.Documents.FindAsync(documentId);
        if (document == null)
        {
            return;
        }

        var startTime = DateTime.UtcNow;

        try
        {
            // Update status to processing
            document.Status = DocumentStatus.Processing;
            await _context.SaveChangesAsync();

            // Step 1: Downloading (0-20%)
            await SendProgressAsync(document.UserId, documentId, document.FileName, 10, "Downloading document...", 0, 0);

            // Download document from blob storage
            Dictionary<string, (string Value, float Confidence, string? BoundingRegions, int? PageNumber)> extractedData;
            await using (var documentStream = await _blobStorage.DownloadFileAsync(document.BlobStorageUrl))
            {
                // Step 2: Analyzing (20-60%)
                await SendProgressAsync(document.UserId, documentId, document.FileName, 30, "Analyzing document with AI...", 0, 0);

                // Analyze with Azure Document Intelligence
                extractedData = await _documentIntelligence.AnalyzeAcord125Async(documentStream, document.FileName);

                // Step 3: Extracting fields (60-90%)
                var totalFields = extractedData.Count;
                var processedFields = 0;

                await SendProgressAsync(document.UserId, documentId, document.FileName, 70, $"Extracting {totalFields} fields...", processedFields, totalFields);

                // Save extracted fields with progress tracking
                foreach (var kvp in extractedData)
                {
                    var field = new ExtractedField
                    {
                        Id = Guid.NewGuid(),
                        DocumentId = document.Id,
                        FieldName = kvp.Key,
                        FieldValue = kvp.Value.Value,
                        Confidence = kvp.Value.Confidence,
                        BoundingRegions = kvp.Value.BoundingRegions,
                        PageNumber = kvp.Value.PageNumber,
                        IsVerified = false,
                        ExtractedAt = DateTime.UtcNow
                    };

                    _context.ExtractedFields.Add(field);
                    processedFields++;

                    // Send progress update every 10 fields or at the end
                    if (processedFields % 10 == 0 || processedFields == totalFields)
                    {
                        var percent = 70 + (int)(20.0 * processedFields / totalFields);
                        await SendProgressAsync(document.UserId, documentId, document.FileName, percent,
                            $"Extracting fields... ({processedFields}/{totalFields})", processedFields, totalFields);
                    }
                }
            }

            // Step 4: Finalizing (90-100%)
            await SendProgressAsync(document.UserId, documentId, document.FileName, 95, "Finalizing...", 0, 0);

            // Update document status
            document.Status = DocumentStatus.Completed;
            document.ProcessedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Increment user's document count
            await _subscriptionService.IncrementDocumentCountAsync(document.UserId);

            // Step 5: Complete
            await SendProgressAsync(document.UserId, documentId, document.FileName, 100, "Processing complete!", 0, 0);

            if (_notificationService != null)
            {
                await _notificationService.SendProcessingCompleteAsync(document.UserId, documentId, true);
                await _notificationService.SendDashboardUpdateAsync(document.UserId);

                // Send persistent notification
                var processingTime = (DateTime.UtcNow - startTime).TotalSeconds;
                await _notificationService.SendNotificationAsync(
                    document.UserId,
                    "Document Processing Complete",
                    $"Successfully processed '{document.FileName}' with {extractedData.Count} fields extracted in {processingTime:F1} seconds.",
                    NotificationType.Success,
                    documentId.ToString(),
                    $"/documents/{documentId}"
                );
            }
        }
        catch (Exception ex)
        {
            document.Status = DocumentStatus.Failed;
            document.ProcessingError = ex.Message;
            await _context.SaveChangesAsync();

            if (_notificationService != null)
            {
                await _notificationService.SendProcessingCompleteAsync(document.UserId, documentId, false);
                await _notificationService.SendDashboardUpdateAsync(document.UserId);

                // Send persistent notification about the failure
                await _notificationService.SendNotificationAsync(
                    document.UserId,
                    "Document Processing Failed",
                    $"Failed to process '{document.FileName}'. Error: {ex.Message}",
                    NotificationType.Error,
                    documentId.ToString(),
                    $"/documents/{documentId}"
                );
            }
        }
    }

    private async Task SendProgressAsync(string userId, Guid documentId, string fileName, int percent, string step, int processedFields, int totalFields)
    {
        if (_notificationService == null) return;

        var progress = new ProcessingProgress
        {
            DocumentId = documentId,
            FileName = fileName,
            Status = "Processing",
            PercentComplete = percent,
            CurrentStep = step,
            ProcessedFields = processedFields,
            TotalFields = totalFields,
            EstimatedSecondsRemaining = percent < 100 ? (int?)((100 - percent) * 0.5) : null
        };

        await _notificationService.SendProcessingProgressAsync(userId, progress);
    }

    public async Task<DashboardMetrics> GetDashboardMetricsAsync(string userId)
    {
        var now = DateTime.UtcNow;
        var today = now.Date;
        var weekAgo = now.AddDays(-7);
        var monthAgo = now.AddDays(-30);

        var documents = await _context.Documents
            .Where(d => d.UserId == userId)
            .Include(d => d.ExtractedFields)
            .ToListAsync();

        // Document Stats
        var documentStats = new DocumentStats
        {
            TotalDocuments = documents.Count,
            CompletedDocuments = documents.Count(d => d.Status == DocumentStatus.Completed),
            ProcessingDocuments = documents.Count(d => d.Status == DocumentStatus.Processing),
            FailedDocuments = documents.Count(d => d.Status == DocumentStatus.Failed),
            UploadedDocuments = documents.Count(d => d.Status == DocumentStatus.Uploaded)
        };

        // Processing Stats
        var completedDocs = documents.Where(d => d.Status == DocumentStatus.Completed && d.ProcessedAt.HasValue).ToList();
        var avgProcessingTime = completedDocs.Any()
            ? completedDocs
                .Where(d => d.ProcessedAt.HasValue)
                .Average(d => (d.ProcessedAt!.Value - d.UploadedAt).TotalSeconds)
            : 0;

        var processingStats = new ProcessingStats
        {
            AverageProcessingTimeSeconds = Math.Round(avgProcessingTime, 2),
            SuccessRate = documents.Count > 0
                ? Math.Round((double)documentStats.CompletedDocuments / documents.Count * 100, 2)
                : 0,
            TotalFieldsExtracted = documents.SelectMany(d => d.ExtractedFields).Count(),
            DocumentsProcessedToday = completedDocs.Count(d => d.ProcessedAt!.Value.Date == today),
            DocumentsProcessedThisWeek = completedDocs.Count(d => d.ProcessedAt!.Value >= weekAgo),
            DocumentsProcessedThisMonth = completedDocs.Count(d => d.ProcessedAt!.Value >= monthAgo)
        };

        // Quality Metrics
        var allFields = documents.SelectMany(d => d.ExtractedFields).ToList();
        var highConfidence = allFields.Count(f => f.Confidence > 0.8);
        var mediumConfidence = allFields.Count(f => f.Confidence > 0.6 && f.Confidence <= 0.8);
        var lowConfidence = allFields.Count(f => f.Confidence <= 0.6);
        var verifiedFields = allFields.Count(f => f.IsVerified);

        var qualityMetrics = new QualityMetrics
        {
            AverageConfidence = allFields.Any()
                ? Math.Round(allFields.Average(f => f.Confidence) * 100, 2)
                : 0,
            HighConfidenceFields = highConfidence,
            MediumConfidenceFields = mediumConfidence,
            LowConfidenceFields = lowConfidence,
            VerifiedFields = verifiedFields,
            VerificationRate = allFields.Any()
                ? Math.Round((double)verifiedFields / allFields.Count * 100, 2)
                : 0
        };

        // Processing Trends (last 30 days)
        var processingTrends = new List<ProcessingTrend>();
        for (int i = 29; i >= 0; i--)
        {
            var date = today.AddDays(-i);
            var nextDate = date.AddDays(1);

            var docsOnDate = completedDocs.Where(d => d.ProcessedAt!.Value >= date && d.ProcessedAt.Value < nextDate).ToList();
            var failedOnDate = documents.Where(d =>
                d.Status == DocumentStatus.Failed &&
                d.UploadedAt >= date &&
                d.UploadedAt < nextDate).ToList();

            processingTrends.Add(new ProcessingTrend
            {
                Date = date,
                DocumentsProcessed = docsOnDate.Count + failedOnDate.Count,
                SuccessfulDocuments = docsOnDate.Count,
                FailedDocuments = failedOnDate.Count
            });
        }

        // Status Breakdown
        var statusBreakdown = new List<StatusBreakdown>
        {
            new StatusBreakdown
            {
                Status = "Uploaded",
                Count = documentStats.UploadedDocuments,
                Percentage = documents.Count > 0
                    ? Math.Round((double)documentStats.UploadedDocuments / documents.Count * 100, 2)
                    : 0
            },
            new StatusBreakdown
            {
                Status = "Processing",
                Count = documentStats.ProcessingDocuments,
                Percentage = documents.Count > 0
                    ? Math.Round((double)documentStats.ProcessingDocuments / documents.Count * 100, 2)
                    : 0
            },
            new StatusBreakdown
            {
                Status = "Completed",
                Count = documentStats.CompletedDocuments,
                Percentage = documents.Count > 0
                    ? Math.Round((double)documentStats.CompletedDocuments / documents.Count * 100, 2)
                    : 0
            },
            new StatusBreakdown
            {
                Status = "Failed",
                Count = documentStats.FailedDocuments,
                Percentage = documents.Count > 0
                    ? Math.Round((double)documentStats.FailedDocuments / documents.Count * 100, 2)
                    : 0
            }
        };

        return new DashboardMetrics
        {
            DocumentStats = documentStats,
            ProcessingStats = processingStats,
            QualityMetrics = qualityMetrics,
            ProcessingTrends = processingTrends,
            StatusBreakdown = statusBreakdown
        };
    }
}
