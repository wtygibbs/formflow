using AcordParser.Core.Interfaces;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Configuration;

namespace AcordParser.Infrastructure.Services;

public class BlobStorageService : IBlobStorageService
{
    private readonly BlobServiceClient _blobServiceClient;
    private readonly string _containerName;

    public BlobStorageService(IConfiguration configuration)
    {
        var connectionString = configuration["AzureStorage:ConnectionString"]
            ?? throw new InvalidOperationException("Azure Storage connection string not configured");

        _containerName = configuration["AzureStorage:ContainerName"] ?? "documents";
        _blobServiceClient = new BlobServiceClient(connectionString);
    }

    public async Task<string> UploadFileAsync(Stream fileStream, string fileName, string contentType)
    {
        var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
        await containerClient.CreateIfNotExistsAsync(PublicAccessType.None);

        var blobName = $"{Guid.NewGuid()}/{fileName}";
        var blobClient = containerClient.GetBlobClient(blobName);

        var blobHttpHeaders = new BlobHttpHeaders { ContentType = contentType };
        await blobClient.UploadAsync(fileStream, new BlobUploadOptions { HttpHeaders = blobHttpHeaders });

        return blobClient.Uri.ToString();
    }

    public async Task<Stream> DownloadFileAsync(string blobUrl)
    {
        // Extract blob name from URL
        var blobName = GetBlobNameFromUrl(blobUrl);

        var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
        var blobClient = containerClient.GetBlobClient(blobName);

        // Download to a MemoryStream to ensure the stream is seekable
        // Azure AI Document Intelligence requires seekable streams
        var memoryStream = new MemoryStream();
        await blobClient.DownloadToAsync(memoryStream);
        memoryStream.Position = 0; // Reset position to the beginning

        return memoryStream;
    }

    public async Task DeleteFileAsync(string blobUrl)
    {
        // Extract blob name from URL
        var blobName = GetBlobNameFromUrl(blobUrl);

        var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
        var blobClient = containerClient.GetBlobClient(blobName);

        await blobClient.DeleteIfExistsAsync();
    }

    private string GetBlobNameFromUrl(string blobUrl)
    {
        // Extract blob name from URL
        // Format: https://{account}.blob.core.windows.net/{container}/{blobName}
        var uri = new Uri(blobUrl);
        var segments = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);

        // First segment is container name, rest is blob name (including any folder structure)
        if (segments.Length < 2)
        {
            throw new ArgumentException("Invalid blob URL format", nameof(blobUrl));
        }

        // Join all segments after container name to handle blob names with '/' (folder structure)
        return string.Join("/", segments.Skip(1));
    }
}
