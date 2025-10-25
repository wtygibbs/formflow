using AcordParser.Core.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AcordParser.Infrastructure.Services;

/// <summary>
/// Background service that processes documents from the queue
/// </summary>
public class DocumentProcessingService : BackgroundService
{
    private readonly IBackgroundTaskQueue _taskQueue;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<DocumentProcessingService> _logger;
    private readonly int _maxConcurrency;

    public DocumentProcessingService(
        IBackgroundTaskQueue taskQueue,
        IServiceProvider serviceProvider,
        ILogger<DocumentProcessingService> logger,
        int maxConcurrency = 3)
    {
        _taskQueue = taskQueue;
        _serviceProvider = serviceProvider;
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
                    // Dequeue document ID
                    var documentId = await _taskQueue.DequeueAsync(stoppingToken);

                    _logger.LogInformation(
                        "Dequeued document {DocumentId} for processing. Queue size: {QueueSize}",
                        documentId,
                        _taskQueue.Count);

                    // Process in background and release semaphore when done
                    var task = Task.Run(async () =>
                    {
                        try
                        {
                            // Create a new scope for this task to get fresh scoped services
                            using var scope = _serviceProvider.CreateScope();
                            var documentService = scope.ServiceProvider.GetRequiredService<IDocumentService>();

                            _logger.LogInformation("Processing document {DocumentId}", documentId);
                            await documentService.ProcessDocumentAsync(documentId);
                            _logger.LogInformation("Successfully processed document {DocumentId}", documentId);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error occurred processing document {DocumentId}", documentId);
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
                    _logger.LogError(ex, "Error dequeuing document");
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
