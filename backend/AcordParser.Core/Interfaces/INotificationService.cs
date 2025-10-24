using AcordParser.Core.DTOs;

namespace AcordParser.Core.Interfaces;

public interface INotificationService
{
    Task SendProcessingProgressAsync(string userId, ProcessingProgress progress);
    Task SendProcessingCompleteAsync(string userId, Guid documentId, bool success);
    Task SendDashboardUpdateAsync(string userId);
}
