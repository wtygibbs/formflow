using AcordParser.Core.Entities;

namespace AcordParser.Core.DTOs;

public record UploadDocumentResponse(
    Guid DocumentId,
    string FileName,
    DocumentStatus Status
);

public record DocumentListResponse(
    Guid Id,
    string FileName,
    DocumentStatus Status,
    DateTime UploadedAt,
    DateTime? ProcessedAt,
    int ExtractedFieldsCount
);

public record DocumentDetailResponse(
    Guid Id,
    string FileName,
    DocumentStatus Status,
    DateTime UploadedAt,
    DateTime? ProcessedAt,
    string? ProcessingError,
    List<ExtractedFieldDTO> ExtractedFields
);

public record ExtractedFieldDTO(
    Guid Id,
    string FieldName,
    string FieldValue,
    float Confidence,
    bool IsVerified,
    string? EditedValue
);

public record UpdateFieldRequest(
    string EditedValue,
    bool IsVerified
);

public record ProcessingStatusResponse(
    Guid DocumentId,
    DocumentStatus Status,
    int Progress,
    string? Message
);
