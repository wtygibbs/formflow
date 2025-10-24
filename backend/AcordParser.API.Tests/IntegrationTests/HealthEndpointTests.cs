using Microsoft.AspNetCore.Mvc.Testing;
using System.Net;
using Xunit;

namespace AcordParser.API.Tests.IntegrationTests;

public class HealthEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public HealthEndpointTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Health_Live_ReturnsOk()
    {
        // Act
        var response = await _client.GetAsync("/api/health/live");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("Healthy", content);
    }

    [Fact]
    public async Task Health_Ready_ReturnsOkOrServiceUnavailable()
    {
        // Act
        var response = await _client.GetAsync("/api/health/ready");

        // Assert
        // Either OK (if DB is configured) or ServiceUnavailable (if not in test env)
        Assert.True(
            response.StatusCode == HttpStatusCode.OK ||
            response.StatusCode == HttpStatusCode.ServiceUnavailable);
    }

    [Fact]
    public async Task Health_Main_ReturnsOk()
    {
        // Act
        var response = await _client.GetAsync("/api/health");

        // Assert
        // Main health endpoint should return OK or ServiceUnavailable depending on dependencies
        Assert.True(
            response.StatusCode == HttpStatusCode.OK ||
            response.StatusCode == HttpStatusCode.ServiceUnavailable);
    }

    [Fact]
    public async Task UnknownEndpoint_ReturnsNotFound()
    {
        // Act
        var response = await _client.GetAsync("/api/nonexistent");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
