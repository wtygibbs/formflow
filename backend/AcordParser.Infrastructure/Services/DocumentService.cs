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

    private static readonly string[] AllowedExtensions = { ".pdf", ".png", ".jpg", ".jpeg", ".tiff" };
    private const long MaxFileSize = 10 * 1024 * 1024; // 10MB

    public DocumentService(
        ApplicationDbContext context,
        IBlobStorageService blobStorage,
        IAzureDocumentIntelligenceService documentIntelligence,
        ISubscriptionService subscriptionService)
    {
        _context = context;
        _blobStorage = blobStorage;
        _documentIntelligence = documentIntelligence;
        _subscriptionService = subscriptionService;
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

        // Process document asynchronously (in background)
        await ProcessDocumentAsync(document.Id);
        //_ = Task.Run(() => ProcessDocumentAsync(document.Id));

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
                f.EditedValue
            ))
            .ToList();

        return new DocumentDetailResponse(
            document.Id,
            document.FileName,
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

        try
        {
            // Update status to processing
            document.Status = DocumentStatus.Processing;
            await _context.SaveChangesAsync();

            // Download document from blob storage and analyze with Azure Document Intelligence
            await using (var documentStream = await _blobStorage.DownloadFileAsync(document.BlobStorageUrl))
            {
                // Analyze with Azure Document Intelligence
                var extractedData = await _documentIntelligence.AnalyzeAcord125Async(documentStream, document.FileName);

                // Save extracted fields
                foreach (var kvp in extractedData)
                {
                    var field = new ExtractedField
                    {
                        Id = Guid.NewGuid(),
                        DocumentId = document.Id,
                        FieldName = kvp.Key,
                        FieldValue = kvp.Value.Value,
                        Confidence = kvp.Value.Confidence,
                        IsVerified = false,
                        ExtractedAt = DateTime.UtcNow
                    };

                    _context.ExtractedFields.Add(field);
                }
            }

            // Update document status
            document.Status = DocumentStatus.Completed;
            document.ProcessedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Increment user's document count
            await _subscriptionService.IncrementDocumentCountAsync(document.UserId);
        }
        catch (Exception ex)
        {
            document.Status = DocumentStatus.Failed;
            document.ProcessingError = ex.Message;
            await _context.SaveChangesAsync();
        }
    }
}
