using AcordParser.API.Hubs;
using AcordParser.Core.DTOs;
using AcordParser.Core.Entities;
using AcordParser.Core.Interfaces;
using AcordParser.Infrastructure.Data;
using Microsoft.AspNetCore.SignalR;

namespace AcordParser.API.Services;

public class SignalRNotificationService : INotificationService
{
    private readonly IHubContext<DocumentProcessingHub> _hubContext;
    private readonly ILogger<SignalRNotificationService> _logger;
    private readonly IServiceProvider _serviceProvider;

    public SignalRNotificationService(
        IHubContext<DocumentProcessingHub> hubContext,
        ILogger<SignalRNotificationService> logger,
        IServiceProvider serviceProvider)
    {
        _hubContext = hubContext;
        _logger = logger;
        _serviceProvider = serviceProvider;
    }

    public async Task SendProcessingProgressAsync(string userId, ProcessingProgress progress)
    {
        try
        {
            await _hubContext.Clients.Group(userId).SendAsync("ProcessingProgress", progress);
            _logger.LogInformation(
                "Sent processing progress to user {UserId}: Document {DocumentId} - {Percent}%",
                userId, progress.DocumentId, progress.PercentComplete);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send processing progress notification to user {UserId}", userId);
        }
    }

    public async Task SendProcessingCompleteAsync(string userId, Guid documentId, bool success)
    {
        try
        {
            await _hubContext.Clients.Group(userId).SendAsync("ProcessingComplete", new
            {
                documentId,
                success,
                timestamp = DateTime.UtcNow
            });
            _logger.LogInformation(
                "Sent processing complete notification to user {UserId}: Document {DocumentId} - Success: {Success}",
                userId, documentId, success);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send processing complete notification to user {UserId}", userId);
        }
    }

    public async Task SendDashboardUpdateAsync(string userId)
    {
        try
        {
            await _hubContext.Clients.Group(userId).SendAsync("DashboardUpdate", new
            {
                timestamp = DateTime.UtcNow
            });
            _logger.LogInformation("Sent dashboard update notification to user {UserId}", userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send dashboard update notification to user {UserId}", userId);
        }
    }

    public async Task SendNotificationAsync(CreateNotificationRequest notification)
    {
        await SendNotificationAsync(
            notification.UserId,
            notification.Title,
            notification.Message,
            notification.Type,
            notification.RelatedEntityId,
            notification.ActionUrl
        );
    }

    public async Task SendNotificationAsync(
        string userId,
        string title,
        string message,
        NotificationType type,
        string? relatedEntityId = null,
        string? actionUrl = null)
    {
        try
        {
            // Create and persist notification to database using scoped DbContext
            Notification notification;
            using (var scope = _serviceProvider.CreateScope())
            {
                var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                notification = new Notification
                {
                    UserId = userId,
                    Title = title,
                    Message = message,
                    Type = type,
                    RelatedEntityId = relatedEntityId,
                    ActionUrl = actionUrl,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                };

                context.Notifications.Add(notification);
                await context.SaveChangesAsync();
            }

            // Send real-time notification via SignalR
            var notificationData = new
            {
                id = notification.Id,
                title = notification.Title,
                message = notification.Message,
                type = notification.Type.ToString(),
                isRead = notification.IsRead,
                createdAt = notification.CreatedAt,
                relatedEntityId = notification.RelatedEntityId,
                actionUrl = notification.ActionUrl
            };

            await _hubContext.Clients.Group(userId).SendAsync("Notification", notificationData);

            _logger.LogInformation(
                "Sent notification to user {UserId}: {Title} - Type: {Type}",
                userId, title, type);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send notification to user {UserId}", userId);
        }
    }
}
