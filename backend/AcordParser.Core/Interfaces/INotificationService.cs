using AcordParser.Core.DTOs;
using AcordParser.Core.Entities;

namespace AcordParser.Core.Interfaces;

public interface INotificationService
{
    Task SendProcessingProgressAsync(string userId, ProcessingProgress progress);
    Task SendProcessingCompleteAsync(string userId, Guid documentId, bool success);
    Task SendDashboardUpdateAsync(string userId);
    Task SendNotificationAsync(CreateNotificationRequest notification);
    Task SendNotificationAsync(string userId, string title, string message, NotificationType type, string? relatedEntityId = null, string? actionUrl = null);
}
