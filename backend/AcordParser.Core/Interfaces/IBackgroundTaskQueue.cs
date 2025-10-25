namespace AcordParser.Core.Interfaces;

/// <summary>
/// Background task queue for processing documents asynchronously
/// </summary>
public interface IBackgroundTaskQueue
{
    /// <summary>
    /// Enqueue a document for processing
    /// </summary>
    ValueTask QueueDocumentAsync(Guid documentId);

    /// <summary>
    /// Dequeue a document ID (called by the background service)
    /// </summary>
    ValueTask<Guid> DequeueAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Get the current queue count
    /// </summary>
    int Count { get; }
}
