using AcordParser.Core.Interfaces;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AcordParser.Infrastructure.Services;

/// <summary>
/// Background service that processes documents from the queue
/// </summary>
public class DocumentProcessingService : BackgroundService
{
    private readonly IBackgroundTaskQueue _taskQueue;
    private readonly ILogger<DocumentProcessingService> _logger;
    private readonly int _maxConcurrency;

    public DocumentProcessingService(
        IBackgroundTaskQueue taskQueue,
        ILogger<DocumentProcessingService> logger,
        int maxConcurrency = 3)
    {
        _taskQueue = taskQueue;
        _logger = logger;
        _maxConcurrency = maxConcurrency;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "Document Processing Service is starting. Max concurrency: {MaxConcurrency}",
            _maxConcurrency);

        // Create a semaphore to limit concurrent processing
        using var semaphore = new SemaphoreSlim(_maxConcurrency);
        var tasks = new List<Task>();

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                // Wait for available slot
                await semaphore.WaitAsync(stoppingToken);

                try
                {
                    // Dequeue work item
                    var workItem = await _taskQueue.DequeueAsync(stoppingToken);

                    _logger.LogInformation("Dequeued a document processing task. Queue size: {QueueSize}", _taskQueue.Count);

                    // Process in background and release semaphore when done
                    var task = Task.Run(async () =>
                    {
                        try
                        {
                            await workItem(stoppingToken);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error occurred processing document");
                        }
                        finally
                        {
                            semaphore.Release();
                        }
                    }, stoppingToken);

                    tasks.Add(task);

                    // Clean up completed tasks periodically
                    tasks.RemoveAll(t => t.IsCompleted);
                }
                catch (OperationCanceledException)
                {
                    // Expected when cancellation is requested
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error dequeuing work item");
                    semaphore.Release(); // Release if we failed to dequeue
                }
            }

            // Wait for all tasks to complete during shutdown
            _logger.LogInformation("Document Processing Service is stopping. Waiting for {TaskCount} tasks to complete...", tasks.Count);
            await Task.WhenAll(tasks);
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Document Processing Service cancellation requested");
        }
        finally
        {
            _logger.LogInformation("Document Processing Service has stopped");
        }
    }
}
