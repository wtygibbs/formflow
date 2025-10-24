namespace AcordParser.Core.Interfaces;

public interface IBlobStorageService
{
    Task<string> UploadFileAsync(Stream fileStream, string fileName, string contentType);
    Task<Stream> DownloadFileAsync(string blobUrl);
    Task DeleteFileAsync(string blobUrl);
    string GenerateSasUrl(string blobUrl, int expiryMinutes = 60);
}
