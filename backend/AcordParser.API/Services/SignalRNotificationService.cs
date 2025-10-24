using AcordParser.API.Hubs;
using AcordParser.Core.DTOs;
using AcordParser.Core.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace AcordParser.API.Services;

public class SignalRNotificationService : INotificationService
{
    private readonly IHubContext<DocumentProcessingHub> _hubContext;
    private readonly ILogger<SignalRNotificationService> _logger;

    public SignalRNotificationService(
        IHubContext<DocumentProcessingHub> hubContext,
        ILogger<SignalRNotificationService> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
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
}
