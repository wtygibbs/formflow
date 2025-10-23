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
            // Analyze document with the specified model
            var operation = await _client.AnalyzeDocumentAsync(
                WaitUntil.Completed,
                _modelId,
                documentStream);

            var result = operation.Value;

            // Extract key-value pairs
            foreach (var kvp in result.KeyValuePairs)
            {
                if (kvp.Key?.Content != null && kvp.Value?.Content != null)
                {
                    var key = kvp.Key.Content.Trim();
                    var value = kvp.Value.Content.Trim();
                    var confidence = kvp.Confidence;

                    results[key] = (value, confidence);
                }
            }

            // Also extract tables if present
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
                            results[$"Table_{table.BoundingRegions.FirstOrDefault().PageNumber}_{key}"] = (value, avgConfidence);
                        }
                    }
                }
            }

            // Extract common ACORD 125 fields from the content
            ExtractAcord125SpecificFields(result, results);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Failed to analyze document: {ex.Message}", ex);
        }

        return results;
    }

    private void ExtractAcord125SpecificFields(AnalyzeResult result, Dictionary<string, (string Value, float Confidence)> results)
    {
        // Common ACORD 125 fields to look for
        var acord125Fields = new[]
        {
            "Agency", "Agency Customer ID", "Producer", "Insured",
            "Mailing Address", "Policy Number", "Effective Date", "Expiration Date",
            "Company", "Company NAIC Code", "Policy Type", "Premium",
            "Limit", "Deductible", "Coverage", "Description of Operations"
        };

        // Try to find these specific fields in the extracted content
        foreach (var page in result.Pages)
        {
            foreach (var line in page.Lines)
            {
                var content = line.Content;

                foreach (var field in acord125Fields)
                {
                    if (content.Contains(field, StringComparison.OrdinalIgnoreCase))
                    {
                        // Extract the value after the field name
                        var parts = content.Split(new[] { ':', '-' }, 2);
                        if (parts.Length == 2)
                        {
                            var key = parts[0].Trim();
                            var value = parts[1].Trim();

                            if (!results.ContainsKey(key) && !string.IsNullOrWhiteSpace(value))
                            {
                                results[key] = (value, line.GetWords().Average(w => w.Confidence));
                            }
                        }
                    }
                }
            }
        }
    }
}
