namespace AcordParser.Core.DTOs;

public record UpdateProfileRequest(
    string? DisplayName,
    string? ProfilePictureUrl
);

public record UpdatePreferencesRequest(
    string? Theme,
    bool? EmailNotifications,
    bool? DocumentProcessingNotifications,
    string? DefaultExportFormat
);

public record UserPreferencesResponse(
    string Theme,
    bool EmailNotifications,
    bool DocumentProcessingNotifications,
    string DefaultExportFormat
);
