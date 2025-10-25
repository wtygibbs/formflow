namespace AcordParser.Core.Interfaces;

/// <summary>
/// Background task queue for processing documents asynchronously
/// </summary>
public interface IBackgroundTaskQueue
{
    /// <summary>
    /// Enqueue a background task
    /// </summary>
    ValueTask QueueBackgroundWorkItemAsync(Func<CancellationToken, ValueTask> workItem);

    /// <summary>
    /// Dequeue a background task (called by the background service)
    /// </summary>
    ValueTask<Func<CancellationToken, ValueTask>> DequeueAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Get the current queue count
    /// </summary>
    int Count { get; }
}
