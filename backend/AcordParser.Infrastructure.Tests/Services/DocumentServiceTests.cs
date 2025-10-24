using AcordParser.Core.DTOs;
using AcordParser.Core.Entities;
using AcordParser.Core.Interfaces;
using AcordParser.Infrastructure.Data;
using AcordParser.Infrastructure.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace AcordParser.Infrastructure.Tests.Services;

public class DocumentServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<IBlobStorageService> _blobStorageMock;
    private readonly Mock<IAzureDocumentIntelligenceService> _documentIntelligenceMock;
    private readonly Mock<ISubscriptionService> _subscriptionServiceMock;
    private readonly Mock<INotificationService> _notificationServiceMock;
    private readonly DocumentService _documentService;

    public DocumentServiceTests()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new ApplicationDbContext(options);

        // Setup mocks
        _blobStorageMock = new Mock<IBlobStorageService>();
        _documentIntelligenceMock = new Mock<IAzureDocumentIntelligenceService>();
        _subscriptionServiceMock = new Mock<ISubscriptionService>();
        _notificationServiceMock = new Mock<INotificationService>();

        _documentService = new DocumentService(
            _context,
            _blobStorageMock.Object,
            _documentIntelligenceMock.Object,
            _subscriptionServiceMock.Object,
            _notificationServiceMock.Object
        );
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    #region UploadDocumentAsync Tests

    [Fact]
    public async Task UploadDocumentAsync_WithValidPdfFile_ReturnsSuccess()
    {
        // Arrange
        var userId = "user-123";
        var fileName = "test-document.pdf";
        var content = "Fake PDF content"u8.ToArray();
        var fileMock = CreateMockFormFile(fileName, content, "application/pdf");

        _subscriptionServiceMock.Setup(s => s.CanProcessDocumentAsync(userId))
            .ReturnsAsync(true);

        _blobStorageMock.Setup(b => b.UploadFileAsync(It.IsAny<Stream>(), fileName, "application/pdf"))
            .ReturnsAsync("https://blob.storage/test-document.pdf");

        _documentIntelligenceMock.Setup(d => d.AnalyzeAcord125Async(It.IsAny<Stream>(), fileName))
            .ReturnsAsync(new Dictionary<string, (string Value, float Confidence)>
            {
                { "PolicyNumber", ("POL-12345", 0.95f) },
                { "InsuredName", ("John Doe", 0.92f) }
            });

        _subscriptionServiceMock.Setup(s => s.IncrementDocumentCountAsync(userId))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _documentService.UploadDocumentAsync(userId, fileMock.Object);

        // Assert
        Assert.NotEqual(Guid.Empty, result.DocumentId);
        Assert.Equal(fileName, result.FileName);
        Assert.Equal(DocumentStatus.Uploaded, result.Status);

        var document = await _context.Documents.FindAsync(result.DocumentId);
        Assert.NotNull(document);
        Assert.Equal(userId, document.UserId);
        Assert.Equal("https://blob.storage/test-document.pdf", document.BlobStorageUrl);
    }

    [Fact]
    public async Task UploadDocumentAsync_WithEmptyFile_ThrowsException()
    {
        // Arrange
        var userId = "user-123";
        var fileMock = CreateMockFormFile("empty.pdf", Array.Empty<byte>(), "application/pdf");

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _documentService.UploadDocumentAsync(userId, fileMock.Object));
    }

    [Fact]
    public async Task UploadDocumentAsync_WithOversizedFile_ThrowsException()
    {
        // Arrange
        var userId = "user-123";
        var largeContent = new byte[11 * 1024 * 1024]; // 11MB (exceeds 10MB limit)
        var fileMock = CreateMockFormFile("large.pdf", largeContent, "application/pdf");

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(() =>
            _documentService.UploadDocumentAsync(userId, fileMock.Object));

        Assert.Contains("File size exceeds maximum", exception.Message);
    }

    [Fact]
    public async Task UploadDocumentAsync_WithInvalidFileType_ThrowsException()
    {
        // Arrange
        var userId = "user-123";
        var content = "some content"u8.ToArray();
        var fileMock = CreateMockFormFile("document.exe", content, "application/exe");

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(() =>
            _documentService.UploadDocumentAsync(userId, fileMock.Object));

        Assert.Contains("File type not allowed", exception.Message);
    }

    [Theory]
    [InlineData("document.pdf")]
    [InlineData("document.png")]
    [InlineData("document.jpg")]
    [InlineData("document.jpeg")]
    [InlineData("document.tiff")]
    public async Task UploadDocumentAsync_WithAllowedFileTypes_Succeeds(string fileName)
    {
        // Arrange
        var userId = "user-123";
        var content = "file content"u8.ToArray();
        var fileMock = CreateMockFormFile(fileName, content, "application/octet-stream");

        _subscriptionServiceMock.Setup(s => s.CanProcessDocumentAsync(userId))
            .ReturnsAsync(true);

        _blobStorageMock.Setup(b => b.UploadFileAsync(It.IsAny<Stream>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync($"https://blob.storage/{fileName}");

        _documentIntelligenceMock.Setup(d => d.AnalyzeAcord125Async(It.IsAny<Stream>(), It.IsAny<string>()))
            .ReturnsAsync(new Dictionary<string, (string Value, float Confidence)>());

        // Act
        var result = await _documentService.UploadDocumentAsync(userId, fileMock.Object);

        // Assert
        Assert.NotEqual(Guid.Empty, result.DocumentId);
        Assert.Equal(fileName, result.FileName);
    }

    [Fact]
    public async Task UploadDocumentAsync_WhenSubscriptionLimitReached_ThrowsException()
    {
        // Arrange
        var userId = "user-123";
        var fileMock = CreateMockFormFile("test.pdf", "content"u8.ToArray(), "application/pdf");

        _subscriptionServiceMock.Setup(s => s.CanProcessDocumentAsync(userId))
            .ReturnsAsync(false);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _documentService.UploadDocumentAsync(userId, fileMock.Object));

        Assert.Contains("Document limit reached", exception.Message);
    }

    #endregion

    #region GetUserDocumentsAsync Tests

    [Fact]
    public async Task GetUserDocumentsAsync_ReturnsUserDocuments_OrderedByUploadDate()
    {
        // Arrange
        var userId = "user-123";
        var doc1 = new Document
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            FileName = "doc1.pdf",
            BlobStorageUrl = "url1",
            Status = DocumentStatus.Completed,
            UploadedAt = DateTime.UtcNow.AddHours(-2),
            ProcessedAt = DateTime.UtcNow.AddHours(-1),
            ExtractedFields = new List<ExtractedField>
            {
                new ExtractedField { Id = Guid.NewGuid(), FieldName = "Field1", FieldValue = "Value1" }
            }
        };

        var doc2 = new Document
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            FileName = "doc2.pdf",
            BlobStorageUrl = "url2",
            Status = DocumentStatus.Processing,
            UploadedAt = DateTime.UtcNow.AddHours(-1),
            ExtractedFields = new List<ExtractedField>()
        };

        // Document from different user (should not be returned)
        var doc3 = new Document
        {
            Id = Guid.NewGuid(),
            UserId = "other-user",
            FileName = "doc3.pdf",
            BlobStorageUrl = "url3",
            Status = DocumentStatus.Completed,
            UploadedAt = DateTime.UtcNow,
            ExtractedFields = new List<ExtractedField>()
        };

        _context.Documents.AddRange(doc1, doc2, doc3);
        await _context.SaveChangesAsync();

        // Act
        var result = await _documentService.GetUserDocumentsAsync(userId);

        // Assert
        Assert.Equal(2, result.Count);
        Assert.Equal("doc2.pdf", result[0].FileName); // Most recent first
        Assert.Equal("doc1.pdf", result[1].FileName);
        Assert.Equal(1, result[1].ExtractedFieldsCount);
        Assert.Equal(0, result[0].ExtractedFieldsCount);
    }

    [Fact]
    public async Task GetUserDocumentsAsync_WithNoDocuments_ReturnsEmptyList()
    {
        // Arrange
        var userId = "user-with-no-docs";

        // Act
        var result = await _documentService.GetUserDocumentsAsync(userId);

        // Assert
        Assert.Empty(result);
    }

    #endregion

    #region GetUserDocumentsPaginatedAsync Tests

    [Fact]
    public async Task GetUserDocumentsPaginatedAsync_WithPagination_ReturnsCorrectPage()
    {
        // Arrange
        var userId = "user-123";
        for (int i = 1; i <= 15; i++)
        {
            _context.Documents.Add(new Document
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                FileName = $"doc{i}.pdf",
                BlobStorageUrl = $"url{i}",
                Status = DocumentStatus.Completed,
                UploadedAt = DateTime.UtcNow.AddHours(-i),
                ExtractedFields = new List<ExtractedField>()
            });
        }
        await _context.SaveChangesAsync();

        var request = new PaginationRequest
        {
            Page = 2,
            PageSize = 5
        };

        // Act
        var result = await _documentService.GetUserDocumentsPaginatedAsync(userId, request);

        // Assert
        Assert.Equal(15, result.TotalCount);
        Assert.Equal(3, result.TotalPages);
        Assert.Equal(2, result.Page);
        Assert.Equal(5, result.PageSize);
        Assert.Equal(5, result.Data.Count);
        Assert.True(result.HasPreviousPage);
        Assert.True(result.HasNextPage);
    }

    [Fact]
    public async Task GetUserDocumentsPaginatedAsync_WithSearchFilter_ReturnsMatchingDocuments()
    {
        // Arrange
        var userId = "user-123";
        _context.Documents.AddRange(
            new Document
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                FileName = "insurance-policy.pdf",
                BlobStorageUrl = "url1",
                Status = DocumentStatus.Completed,
                UploadedAt = DateTime.UtcNow,
                ExtractedFields = new List<ExtractedField>()
            },
            new Document
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                FileName = "tax-return.pdf",
                BlobStorageUrl = "url2",
                Status = DocumentStatus.Completed,
                UploadedAt = DateTime.UtcNow,
                ExtractedFields = new List<ExtractedField>()
            }
        );
        await _context.SaveChangesAsync();

        var request = new PaginationRequest
        {
            Page = 1,
            PageSize = 10,
            Search = "insurance"
        };

        // Act
        var result = await _documentService.GetUserDocumentsPaginatedAsync(userId, request);

        // Assert
        Assert.Equal(1, result.TotalCount);
        Assert.Equal("insurance-policy.pdf", result.Data[0].FileName);
    }

    [Fact]
    public async Task GetUserDocumentsPaginatedAsync_WithStatusFilter_ReturnsFilteredDocuments()
    {
        // Arrange
        var userId = "user-123";
        _context.Documents.AddRange(
            new Document
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                FileName = "completed.pdf",
                BlobStorageUrl = "url1",
                Status = DocumentStatus.Completed,
                UploadedAt = DateTime.UtcNow,
                ExtractedFields = new List<ExtractedField>()
            },
            new Document
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                FileName = "failed.pdf",
                BlobStorageUrl = "url2",
                Status = DocumentStatus.Failed,
                UploadedAt = DateTime.UtcNow,
                ExtractedFields = new List<ExtractedField>()
            }
        );
        await _context.SaveChangesAsync();

        var request = new PaginationRequest
        {
            Page = 1,
            PageSize = 10,
            Status = "Completed"
        };

        // Act
        var result = await _documentService.GetUserDocumentsPaginatedAsync(userId, request);

        // Assert
        Assert.Equal(1, result.TotalCount);
        Assert.Equal("completed.pdf", result.Data[0].FileName);
    }

    #endregion

    #region GetDocumentDetailAsync Tests

    [Fact]
    public async Task GetDocumentDetailAsync_WithValidId_ReturnsDocumentDetails()
    {
        // Arrange
        var userId = "user-123";
        var documentId = Guid.NewGuid();
        var document = new Document
        {
            Id = documentId,
            UserId = userId,
            FileName = "test.pdf",
            BlobStorageUrl = "url",
            Status = DocumentStatus.Completed,
            UploadedAt = DateTime.UtcNow,
            ProcessedAt = DateTime.UtcNow.AddMinutes(5),
            ExtractedFields = new List<ExtractedField>
            {
                new ExtractedField
                {
                    Id = Guid.NewGuid(),
                    DocumentId = documentId,
                    FieldName = "PolicyNumber",
                    FieldValue = "POL-123",
                    Confidence = 0.95f,
                    IsVerified = true,
                    EditedValue = "POL-123-EDITED"
                }
            }
        };

        _context.Documents.Add(document);
        await _context.SaveChangesAsync();

        // Act
        var result = await _documentService.GetDocumentDetailAsync(documentId, userId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(documentId, result.Id);
        Assert.Equal("test.pdf", result.FileName);
        Assert.Equal(DocumentStatus.Completed, result.Status);
        Assert.Single(result.ExtractedFields);
        Assert.Equal("PolicyNumber", result.ExtractedFields[0].FieldName);
        Assert.Equal("POL-123-EDITED", result.ExtractedFields[0].EditedValue);
    }

    [Fact]
    public async Task GetDocumentDetailAsync_WithInvalidId_ReturnsNull()
    {
        // Arrange
        var userId = "user-123";
        var invalidId = Guid.NewGuid();

        // Act
        var result = await _documentService.GetDocumentDetailAsync(invalidId, userId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetDocumentDetailAsync_WithDifferentUserId_ReturnsNull()
    {
        // Arrange
        var documentId = Guid.NewGuid();
        var document = new Document
        {
            Id = documentId,
            UserId = "user-123",
            FileName = "test.pdf",
            BlobStorageUrl = "url",
            Status = DocumentStatus.Completed,
            UploadedAt = DateTime.UtcNow,
            ExtractedFields = new List<ExtractedField>()
        };

        _context.Documents.Add(document);
        await _context.SaveChangesAsync();

        // Act
        var result = await _documentService.GetDocumentDetailAsync(documentId, "different-user");

        // Assert
        Assert.Null(result);
    }

    #endregion

    #region UpdateExtractedFieldAsync Tests

    [Fact]
    public async Task UpdateExtractedFieldAsync_WithValidData_UpdatesField()
    {
        // Arrange
        var userId = "user-123";
        var documentId = Guid.NewGuid();
        var fieldId = Guid.NewGuid();

        var document = new Document
        {
            Id = documentId,
            UserId = userId,
            FileName = "test.pdf",
            BlobStorageUrl = "url",
            Status = DocumentStatus.Completed,
            UploadedAt = DateTime.UtcNow,
            ExtractedFields = new List<ExtractedField>
            {
                new ExtractedField
                {
                    Id = fieldId,
                    DocumentId = documentId,
                    FieldName = "PolicyNumber",
                    FieldValue = "POL-123",
                    Confidence = 0.85f,
                    IsVerified = false
                }
            }
        };

        _context.Documents.Add(document);
        await _context.SaveChangesAsync();

        var request = new UpdateFieldRequest("POL-123-CORRECTED", true);

        // Act
        var result = await _documentService.UpdateExtractedFieldAsync(fieldId, userId, request);

        // Assert
        Assert.True(result);

        var updatedField = await _context.ExtractedFields.FindAsync(fieldId);
        Assert.NotNull(updatedField);
        Assert.Equal("POL-123-CORRECTED", updatedField.EditedValue);
        Assert.True(updatedField.IsVerified);
        Assert.NotNull(updatedField.VerifiedAt);
    }

    [Fact]
    public async Task UpdateExtractedFieldAsync_WithInvalidFieldId_ReturnsFalse()
    {
        // Arrange
        var userId = "user-123";
        var invalidFieldId = Guid.NewGuid();
        var request = new UpdateFieldRequest("NewValue", true);

        // Act
        var result = await _documentService.UpdateExtractedFieldAsync(invalidFieldId, userId, request);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task UpdateExtractedFieldAsync_WithDifferentUserId_ReturnsFalse()
    {
        // Arrange
        var documentId = Guid.NewGuid();
        var fieldId = Guid.NewGuid();

        var document = new Document
        {
            Id = documentId,
            UserId = "user-123",
            FileName = "test.pdf",
            BlobStorageUrl = "url",
            Status = DocumentStatus.Completed,
            UploadedAt = DateTime.UtcNow,
            ExtractedFields = new List<ExtractedField>
            {
                new ExtractedField
                {
                    Id = fieldId,
                    DocumentId = documentId,
                    FieldName = "Field",
                    FieldValue = "Value",
                    Confidence = 0.9f
                }
            }
        };

        _context.Documents.Add(document);
        await _context.SaveChangesAsync();

        var request = new UpdateFieldRequest("NewValue", true);

        // Act
        var result = await _documentService.UpdateExtractedFieldAsync(fieldId, "different-user", request);

        // Assert
        Assert.False(result);
    }

    #endregion

    #region ExportToCsvAsync Tests

    [Fact]
    public async Task ExportToCsvAsync_WithValidDocument_ReturnsCsvData()
    {
        // Arrange
        var userId = "user-123";
        var documentId = Guid.NewGuid();
        var document = new Document
        {
            Id = documentId,
            UserId = userId,
            FileName = "test.pdf",
            BlobStorageUrl = "url",
            Status = DocumentStatus.Completed,
            UploadedAt = DateTime.UtcNow,
            ExtractedFields = new List<ExtractedField>
            {
                new ExtractedField
                {
                    Id = Guid.NewGuid(),
                    DocumentId = documentId,
                    FieldName = "PolicyNumber",
                    FieldValue = "POL-123",
                    Confidence = 0.95f,
                    IsVerified = true,
                    EditedValue = "POL-123-CORRECTED",
                    ExtractedAt = DateTime.UtcNow
                },
                new ExtractedField
                {
                    Id = Guid.NewGuid(),
                    DocumentId = documentId,
                    FieldName = "InsuredName",
                    FieldValue = "John Doe",
                    Confidence = 0.92f,
                    IsVerified = false,
                    ExtractedAt = DateTime.UtcNow
                }
            }
        };

        _context.Documents.Add(document);
        await _context.SaveChangesAsync();

        // Act
        var result = await _documentService.ExportToCsvAsync(documentId, userId);

        // Assert
        Assert.NotEmpty(result);

        var csvContent = System.Text.Encoding.UTF8.GetString(result);
        Assert.Contains("Field Name,Original Value,Edited Value,Confidence,Verified,Extracted At", csvContent);
        Assert.Contains("PolicyNumber", csvContent);
        Assert.Contains("POL-123", csvContent);
        Assert.Contains("POL-123-CORRECTED", csvContent);
        Assert.Contains("InsuredName", csvContent);
        Assert.Contains("John Doe", csvContent);
    }

    [Fact]
    public async Task ExportToCsvAsync_WithInvalidDocument_ThrowsException()
    {
        // Arrange
        var userId = "user-123";
        var invalidId = Guid.NewGuid();

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _documentService.ExportToCsvAsync(invalidId, userId));
    }

    #endregion

    #region Helper Methods

    private Mock<IFormFile> CreateMockFormFile(string fileName, byte[] content, string contentType)
    {
        var fileMock = new Mock<IFormFile>();
        var ms = new MemoryStream(content);

        fileMock.Setup(f => f.FileName).Returns(fileName);
        fileMock.Setup(f => f.Length).Returns(content.Length);
        fileMock.Setup(f => f.ContentType).Returns(contentType);
        fileMock.Setup(f => f.OpenReadStream()).Returns(ms);
        fileMock.Setup(f => f.CopyToAsync(It.IsAny<Stream>(), It.IsAny<CancellationToken>()))
            .Returns((Stream stream, CancellationToken token) => ms.CopyToAsync(stream, token));

        return fileMock;
    }

    #endregion
}
