using AcordParser.Core.DTOs;
using Microsoft.AspNetCore.Http;

namespace AcordParser.Core.Interfaces;

public interface IDocumentService
{
    Task<UploadDocumentResponse> UploadDocumentAsync(string userId, IFormFile file);
    Task<List<DocumentListResponse>> GetUserDocumentsAsync(string userId);
    Task<DocumentDetailResponse?> GetDocumentDetailAsync(Guid documentId, string userId);
    Task<bool> UpdateExtractedFieldAsync(Guid fieldId, string userId, UpdateFieldRequest request);
    Task<byte[]> ExportToCsvAsync(Guid documentId, string userId);
    Task ProcessDocumentAsync(Guid documentId);
}
