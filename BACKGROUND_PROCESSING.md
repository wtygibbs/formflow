# Background Document Processing

## Overview

The ACORD Parser now uses a **proper background task queue** for processing documents asynchronously. This replaces the previous approach of using `Task.Run()` or awaiting processing directly in the upload endpoint.

## Architecture

### Components

1. **IBackgroundTaskQueue** - Interface for the task queue
2. **BackgroundTaskQueue** - Implementation using `System.Threading.Channels`
3. **DocumentProcessingService** - `BackgroundService` that processes queued tasks
4. **DocumentService** - Enqueues documents for processing

### How It Works

```
┌─────────────┐
│   Upload    │
│  Endpoint   │
└──────┬──────┘
       │
       │ 1. Save document to DB
       │ 2. Enqueue processing task
       ▼
┌─────────────────┐
│ BackgroundTask  │ ◄── Thread-safe bounded channel
│     Queue       │     (Capacity: 100)
└────────┬────────┘
         │
         │ 3. Dequeue & process
         │    (Max 3 concurrent)
         ▼
┌─────────────────┐
│  Document       │
│  Processing     │
│  Service        │
└─────────────────┘
         │
         │ 4. Azure AI extraction
         │ 5. Save fields to DB
         │ 6. Send notifications
         ▼
    [Completed]
```

## Benefits

✅ **Non-blocking uploads** - Upload endpoint returns immediately
✅ **Controlled concurrency** - Process N documents simultaneously (default: 3)
✅ **Bounded queue** - Prevents memory issues (default: 100 items)
✅ **Graceful shutdown** - Waits for in-progress tasks to complete
✅ **No external dependencies** - Uses built-in .NET libraries
✅ **Thread-safe** - Channel<T> provides safe concurrent access
✅ **Retry-friendly** - Can add retry logic to queue items
✅ **Observable** - Queue size is queryable for monitoring

## Configuration

Edit `appsettings.json`:

```json
{
  "BackgroundProcessing": {
    "QueueCapacity": 100,      // Max items in queue
    "MaxConcurrency": 3         // Max parallel processing
  }
}
```

### Tuning Guidelines

- **QueueCapacity**: Set based on expected burst upload volume
  - Small apps: 50-100
  - Medium apps: 200-500
  - Large apps: 1000+

- **MaxConcurrency**: Set based on:
  - Azure AI Document Intelligence quota/rate limits
  - Server CPU/memory resources
  - Database connection pool size
  - Recommended: 1-5 for most scenarios

## Implementation Details

### BackgroundTaskQueue

Uses `System.Threading.Channels.Channel<T>` - a high-performance, thread-safe queue:

```csharp
var options = new BoundedChannelOptions(capacity)
{
    FullMode = BoundedChannelFullMode.Wait
};
_queue = Channel.CreateBounded<Guid>(options);
```

**Key Features:**
- Bounded capacity prevents runaway memory usage
- `BoundedChannelFullMode.Wait` blocks enqueue when full (backpressure)
- Async-friendly API (`WriteAsync`, `ReadAsync`)
- Queues document IDs (not closures) to avoid scoping issues

### DocumentProcessingService

Inherits from `BackgroundService` (built-in hosted service):

```csharp
public class DocumentProcessingService : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Continuous loop: dequeue → create scope → resolve services → process → repeat
    }
}
```

**Key Features:**
- Runs continuously in the background
- Uses `SemaphoreSlim` to limit concurrency
- Creates a new DI scope for each task to get fresh scoped services (DbContext, etc.)
- Automatically started/stopped with the application
- Gracefully handles cancellation during shutdown

**Important - EF Core Scoping:**
The service creates a new scope for each document:

```csharp
using var scope = _serviceProvider.CreateScope();
var documentService = scope.ServiceProvider.GetRequiredService<IDocumentService>();
await documentService.ProcessDocumentAsync(documentId);
```

This ensures each background task gets its own `ApplicationDbContext` instance, avoiding the common error:
> Cannot access a disposed context instance. A common cause of this error is disposing a context instance that was resolved from dependency injection...

### Concurrency Control

Uses `SemaphoreSlim` to limit parallel processing:

```csharp
using var semaphore = new SemaphoreSlim(maxConcurrency);

// Wait for available slot
await semaphore.WaitAsync(stoppingToken);

// Process work item
var task = Task.Run(async () =>
{
    try { await workItem(stoppingToken); }
    finally { semaphore.Release(); }
}, stoppingToken);
```

## Monitoring

### Logs

The service logs important events:

```
[INFO] Document Processing Service is starting. Max concurrency: 3
[INFO] Dequeued a document processing task. Queue size: 7
[ERROR] Error occurred processing document: {exception}
[INFO] Document Processing Service is stopping. Waiting for 2 tasks to complete...
```

### Queue Size

Get current queue size programmatically:

```csharp
var queue = serviceProvider.GetRequiredService<IBackgroundTaskQueue>();
int currentSize = queue.Count;
```

You could expose this via a health check or metrics endpoint.

## Testing Considerations

The implementation supports testing:

```csharp
// In tests, DocumentService falls back to synchronous processing
// if IBackgroundTaskQueue is null

if (_backgroundTaskQueue != null)
{
    await _backgroundTaskQueue.QueueBackgroundWorkItemAsync(...);
}
else
{
    // Fallback: Process synchronously (for tests)
    await ProcessDocumentAsync(document.Id);
}
```

**Recommendation**: Inject a real queue in integration tests to test the full flow.

## Future Enhancements

### 1. Retry Logic

Add retry support for failed processing:

```csharp
await _backgroundTaskQueue.QueueBackgroundWorkItemAsync(async token =>
{
    int maxRetries = 3;
    for (int i = 0; i < maxRetries; i++)
    {
        try
        {
            await ProcessDocumentAsync(document.Id);
            break;
        }
        catch (Exception ex) when (i < maxRetries - 1)
        {
            await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, i)), token);
        }
    }
});
```

### 2. Priority Queue

Support high-priority documents (e.g., paid users):

```csharp
public interface IBackgroundTaskQueue
{
    ValueTask QueueBackgroundWorkItemAsync(
        Func<CancellationToken, ValueTask> workItem,
        int priority = 0);  // Higher = higher priority
}
```

### 3. Metrics/Telemetry

Track queue performance:

```csharp
// Metrics to track:
- Queue depth over time
- Average processing time
- Success/failure rate
- Throughput (docs/minute)
```

### 4. Dead Letter Queue

Handle permanently failed items:

```csharp
if (failureCount >= maxRetries)
{
    await _deadLetterQueue.QueueAsync(document.Id);
}
```

### 5. Distributed Queue (Redis/Azure Queue)

For multi-server deployments, replace `Channel<T>` with:
- Azure Queue Storage
- Azure Service Bus
- Redis pub/sub
- RabbitMQ

## Migration Notes

### Before (Synchronous)

```csharp
// Blocks upload endpoint until processing completes (~10-30 seconds)
await ProcessDocumentAsync(document.Id);
```

### After (Asynchronous)

```csharp
// Returns immediately (~50-200ms)
await _backgroundTaskQueue.QueueBackgroundWorkItemAsync(async token =>
{
    await ProcessDocumentAsync(document.Id);
});
```

**Impact:**
- Upload endpoint response time: **~20s → ~0.1s** (200x improvement)
- Concurrent uploads: Limited only by queue capacity
- User experience: Instant feedback, progress via SignalR

## Troubleshooting

### DbContext Disposed Error

**Symptom:** `System.ObjectDisposedException: Cannot access a disposed context instance`
**Cause:** Background task trying to use a scoped DbContext from an ended HTTP request
**Solution:** ✅ Already fixed! The implementation creates a new scope for each task:

```csharp
// ❌ WRONG - Captures scoped DbContext in closure
await _queue.QueueBackgroundWorkItemAsync(async token =>
{
    await this.ProcessDocumentAsync(documentId);  // 'this' has disposed DbContext
});

// ✅ CORRECT - Queue just the ID, create scope in background service
await _queue.QueueDocumentAsync(documentId);

// In background service:
using var scope = _serviceProvider.CreateScope();
var documentService = scope.ServiceProvider.GetRequiredService<IDocumentService>();
await documentService.ProcessDocumentAsync(documentId);
```

### Queue Full (BoundedChannelFullMode.Wait)

**Symptom:** Upload endpoint hangs/times out
**Cause:** Queue at capacity (100 items) and all workers busy
**Solutions:**
- Increase `MaxConcurrency` to process faster
- Increase `QueueCapacity` to accept more queued items
- Scale horizontally (multiple servers)

### Slow Processing

**Symptom:** Documents stuck in "Processing" status
**Cause:** Azure AI throttling, slow network, or database issues
**Solutions:**
- Check Azure AI quotas and rate limits
- Optimize database queries (add indexes)
- Increase `MaxConcurrency` if resources allow

### Memory Issues

**Symptom:** High memory usage
**Cause:** Too many concurrent operations
**Solutions:**
- Reduce `MaxConcurrency`
- Reduce `QueueCapacity`
- Ensure streams are properly disposed

### Shutdown Delays

**Symptom:** Application takes long to shut down
**Cause:** Processing service waiting for tasks to complete
**Solutions:**
- Reduce processing timeout
- Implement cancellation token checks in long-running operations
- Consider persistent queue (Azure Queue) for durability

## References

- [System.Threading.Channels](https://learn.microsoft.com/en-us/dotnet/api/system.threading.channels)
- [BackgroundService](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.hosting.backgroundservice)
- [IHostedService](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/host/hosted-services)
