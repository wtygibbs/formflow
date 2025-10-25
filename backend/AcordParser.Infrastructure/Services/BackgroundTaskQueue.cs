using AcordParser.Core.Interfaces;
using System.Threading.Channels;

namespace AcordParser.Infrastructure.Services;

/// <summary>
/// Thread-safe background task queue using System.Threading.Channels
/// </summary>
public class BackgroundTaskQueue : IBackgroundTaskQueue
{
    private readonly Channel<Guid> _queue;

    public BackgroundTaskQueue(int capacity = 100)
    {
        // Create a bounded channel with capacity limit
        // BoundedChannelFullMode.Wait will cause QueueDocumentAsync to wait when queue is full
        var options = new BoundedChannelOptions(capacity)
        {
            FullMode = BoundedChannelFullMode.Wait
        };
        _queue = Channel.CreateBounded<Guid>(options);
    }

    public async ValueTask QueueDocumentAsync(Guid documentId)
    {
        if (documentId == Guid.Empty)
        {
            throw new ArgumentException("Document ID cannot be empty", nameof(documentId));
        }

        await _queue.Writer.WriteAsync(documentId);
    }

    public async ValueTask<Guid> DequeueAsync(CancellationToken cancellationToken)
    {
        var documentId = await _queue.Reader.ReadAsync(cancellationToken);
        return documentId;
    }

    public int Count => _queue.Reader.Count;
}
