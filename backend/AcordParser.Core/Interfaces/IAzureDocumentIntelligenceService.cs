namespace AcordParser.Core.Interfaces;

public interface IAzureDocumentIntelligenceService
{
    Task<Dictionary<string, (string Value, float Confidence)>> AnalyzeAcord125Async(Stream documentStream, string fileName);
}
