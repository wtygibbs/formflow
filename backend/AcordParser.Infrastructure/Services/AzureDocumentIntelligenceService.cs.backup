using AcordParser.Core.Interfaces;
using Azure;
using Azure.AI.FormRecognizer.DocumentAnalysis;
using Microsoft.Extensions.Configuration;

namespace AcordParser.Infrastructure.Services;

public class AzureDocumentIntelligenceService : IAzureDocumentIntelligenceService
{
    private readonly DocumentAnalysisClient _client;
    private readonly string _modelId;

    public AzureDocumentIntelligenceService(IConfiguration configuration)
    {
        var endpoint = configuration["AzureDocumentIntelligence:Endpoint"]
            ?? throw new InvalidOperationException("Azure Document Intelligence endpoint not configured");
        var apiKey = configuration["AzureDocumentIntelligence:ApiKey"]
            ?? throw new InvalidOperationException("Azure Document Intelligence API key not configured");

        _modelId = configuration["AzureDocumentIntelligence:ModelId"] ?? "prebuilt-document";

        _client = new DocumentAnalysisClient(new Uri(endpoint), new AzureKeyCredential(apiKey));
    }

    public async Task<Dictionary<string, (string Value, float Confidence)>> AnalyzeAcord125Async(
        Stream documentStream,
        string fileName)
    {
        var results = new Dictionary<string, (string Value, float Confidence)>();

        try
        {
            // Analyze document with the custom trained model
            var operation = await _client.AnalyzeDocumentAsync(
                WaitUntil.Completed,
                _modelId,
                documentStream);

            var result = operation.Value;

            // Extract fields from custom model - fields are in Documents[].Fields
            if (result.Documents != null && result.Documents.Count > 0)
            {
                foreach (var document in result.Documents)
                {
                    if (document.Fields == null)
                        continue;

                    foreach (var field in document.Fields)
                    {
                        var fieldName = field.Key;
                        var fieldValue = field.Value;

                        if (fieldValue != null)
                        {
                            // Extract the content/value from the field
                            string value = ExtractFieldValue(fieldValue);
                            float confidence = fieldValue.Confidence ?? 0f;

                            if (!string.IsNullOrWhiteSpace(value))
                            {
                                results[fieldName] = (value, confidence);
                            }
                        }
                    }
                }
            }

            // Fallback: If no documents were found, try the old methods
            // This ensures backward compatibility with prebuilt models
            if (results.Count == 0)
            {
                ExtractFromKeyValuePairs(result, results);
                ExtractFromTables(result, results);
            }
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Failed to analyze document: {ex.Message}", ex);
        }

        return results;
    }

    private string ExtractFieldValue(DocumentField field)
    {
        // Handle different field types
        return field.FieldType switch
        {
            DocumentFieldType.String => field.Value.AsString(),
            DocumentFieldType.Date => field.Value.AsDate().ToString("yyyy-MM-dd"),
            DocumentFieldType.Time => field.Value.AsTime().ToString(),
            DocumentFieldType.PhoneNumber => field.Value.AsPhoneNumber(),
            DocumentFieldType.Double => field.Value.AsDouble().ToString(),
            DocumentFieldType.Int64 => field.Value.AsInt64().ToString(),
            DocumentFieldType.Address => field.Content,
            DocumentFieldType.List => string.Join(", ", field.Value.AsList().Select(f => ExtractFieldValue(f))),
            DocumentFieldType.Dictionary => string.Join("; ", field.Value.AsDictionary().Select(kvp => $"{kvp.Key}: {ExtractFieldValue(kvp.Value)}")),
            _ => field.Content ?? string.Empty
        };
    }

    private void ExtractFromKeyValuePairs(AnalyzeResult result, Dictionary<string, (string Value, float Confidence)> results)
    {
        // Extract key-value pairs (for prebuilt models)
        foreach (var kvp in result.KeyValuePairs)
        {
            if (kvp.Key?.Content != null && kvp.Value?.Content != null)
            {
                var key = kvp.Key.Content.Trim();
                var value = kvp.Value.Content.Trim();
                var confidence = kvp.Confidence;

                if (!results.ContainsKey(key))
                {
                    results[key] = (value, confidence);
                }
            }
        }
    }

    private void ExtractFromTables(AnalyzeResult result, Dictionary<string, (string Value, float Confidence)> results)
    {
        // Extract tables (for prebuilt models)
        foreach (var table in result.Tables)
        {
            for (int row = 0; row < table.RowCount; row++)
            {
                var rowCells = table.Cells.Where(c => c.RowIndex == row).OrderBy(c => c.ColumnIndex).ToList();

                if (rowCells.Count >= 2)
                {
                    var key = rowCells[0].Content.Trim();
                    var value = string.Join(", ", rowCells.Skip(1).Select(c => c.Content.Trim()));

                    if (!string.IsNullOrWhiteSpace(key) && !string.IsNullOrWhiteSpace(value))
                    {
                        // Use average confidence from cells
                        var avgConfidence = rowCells.Average(c => c.BoundingRegions.FirstOrDefault().BoundingPolygon.Count > 0 ? 0.8f : 0.5f);
                        var tableKey = $"Table_{table.BoundingRegions.FirstOrDefault().PageNumber}_{key}";

                        if (!results.ContainsKey(tableKey))
                        {
                            results[tableKey] = (value, avgConfidence);
                        }
                    }
                }
            }
        }
    }

}
