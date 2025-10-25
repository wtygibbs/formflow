using AcordParser.Core.Entities;

namespace AcordParser.Core.DTOs;

public record NotificationResponse(
    Guid Id,
    string Title,
    string Message,
    string Type,
    bool IsRead,
    DateTime CreatedAt,
    DateTime? ReadAt,
    string? RelatedEntityId,
    string? ActionUrl
);

public record CreateNotificationRequest(
    string UserId,
    string Title,
    string Message,
    NotificationType Type,
    string? RelatedEntityId = null,
    string? ActionUrl = null
);

public record MarkNotificationsReadRequest(
    List<Guid> NotificationIds
);
