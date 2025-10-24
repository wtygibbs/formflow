using AcordParser.Core.DTOs;
using AcordParser.Core.Entities;
using AcordParser.Infrastructure.Data;
using AcordParser.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using Xunit;

namespace AcordParser.Infrastructure.Tests.Services;

public class SubscriptionServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<UserManager<User>> _userManagerMock;
    private readonly Mock<IConfiguration> _configurationMock;
    private readonly SubscriptionService _subscriptionService;

    public SubscriptionServiceTests()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new ApplicationDbContext(options);

        // Setup UserManager mock
        var userStoreMock = new Mock<IUserStore<User>>();
        _userManagerMock = new Mock<UserManager<User>>(
            userStoreMock.Object, null, null, null, null, null, null, null, null);

        // Setup Configuration mock
        _configurationMock = new Mock<IConfiguration>();
        _configurationMock.Setup(c => c["Stripe:SecretKey"]).Returns("sk_test_fake_key_for_testing");
        _configurationMock.Setup(c => c["Stripe:PublishableKey"]).Returns("pk_test_fake_key_for_testing");
        _configurationMock.Setup(c => c["Stripe:WebhookSecret"]).Returns("whsec_test_fake_secret");
        _configurationMock.Setup(c => c["App:BaseUrl"]).Returns("https://example.com");

        _subscriptionService = new SubscriptionService(
            _context,
            _userManagerMock.Object,
            _configurationMock.Object
        );
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    #region GetUserSubscriptionAsync Tests

    [Fact]
    public async Task GetUserSubscriptionAsync_WithFreeUser_ReturnsFreeTierInfo()
    {
        // Arrange
        var userId = "user-123";
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            UserName = "test@example.com",
            SubscriptionTier = SubscriptionTier.Free,
            DocumentsProcessedThisMonth = 10
        };

        _userManagerMock.Setup(um => um.FindByIdAsync(userId))
            .ReturnsAsync(user);

        // Act
        var result = await _subscriptionService.GetUserSubscriptionAsync(userId);

        // Assert
        Assert.Equal(SubscriptionTier.Free, result.Tier);
        Assert.Equal(10, result.DocumentsProcessedThisMonth);
        Assert.Equal(25, result.DocumentLimit); // Free tier limit
        Assert.Equal(SubscriptionStatus.Active, result.Status);
        Assert.Null(result.MonthlyPrice);
    }

    [Fact]
    public async Task GetUserSubscriptionAsync_WithPaidUser_ReturnsPaidTierInfo()
    {
        // Arrange
        var userId = "user-123";
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            UserName = "test@example.com",
            SubscriptionTier = SubscriptionTier.Starter,
            DocumentsProcessedThisMonth = 50,
            SubscriptionExpiresAt = DateTime.UtcNow.AddMonths(1)
        };

        var subscription = new Subscription
        {
            UserId = userId,
            Tier = SubscriptionTier.Starter,
            Status = SubscriptionStatus.Active,
            MonthlyPrice = 29m,
            StripeSubscriptionId = "sub_123"
        };

        _userManagerMock.Setup(um => um.FindByIdAsync(userId))
            .ReturnsAsync(user);

        _context.Subscriptions.Add(subscription);
        await _context.SaveChangesAsync();

        // Act
        var result = await _subscriptionService.GetUserSubscriptionAsync(userId);

        // Assert
        Assert.Equal(SubscriptionTier.Starter, result.Tier);
        Assert.Equal(50, result.DocumentsProcessedThisMonth);
        Assert.Equal(100, result.DocumentLimit); // Starter tier limit
        Assert.Equal(SubscriptionStatus.Active, result.Status);
        Assert.Equal(29m, result.MonthlyPrice);
        Assert.NotNull(result.ExpiresAt);
    }

    [Fact]
    public async Task GetUserSubscriptionAsync_WithInvalidUser_ThrowsException()
    {
        // Arrange
        var userId = "invalid-user";

        _userManagerMock.Setup(um => um.FindByIdAsync(userId))
            .ReturnsAsync((User?)null);

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _subscriptionService.GetUserSubscriptionAsync(userId));
    }

    #endregion

    #region CanProcessDocumentAsync Tests

    [Fact]
    public async Task CanProcessDocumentAsync_UnderLimit_ReturnsTrue()
    {
        // Arrange
        var userId = "user-123";
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            SubscriptionTier = SubscriptionTier.Free,
            DocumentsProcessedThisMonth = 10 // Under 25 limit
        };

        _userManagerMock.Setup(um => um.FindByIdAsync(userId))
            .ReturnsAsync(user);

        // Act
        var result = await _subscriptionService.CanProcessDocumentAsync(userId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task CanProcessDocumentAsync_AtLimit_ReturnsFalse()
    {
        // Arrange
        var userId = "user-123";
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            SubscriptionTier = SubscriptionTier.Free,
            DocumentsProcessedThisMonth = 25 // At limit
        };

        _userManagerMock.Setup(um => um.FindByIdAsync(userId))
            .ReturnsAsync(user);

        // Act
        var result = await _subscriptionService.CanProcessDocumentAsync(userId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task CanProcessDocumentAsync_OverLimit_ReturnsFalse()
    {
        // Arrange
        var userId = "user-123";
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            SubscriptionTier = SubscriptionTier.Starter,
            DocumentsProcessedThisMonth = 101 // Over 100 limit
        };

        _userManagerMock.Setup(um => um.FindByIdAsync(userId))
            .ReturnsAsync(user);

        // Act
        var result = await _subscriptionService.CanProcessDocumentAsync(userId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task CanProcessDocumentAsync_WithInvalidUser_ReturnsFalse()
    {
        // Arrange
        var userId = "invalid-user";

        _userManagerMock.Setup(um => um.FindByIdAsync(userId))
            .ReturnsAsync((User?)null);

        // Act
        var result = await _subscriptionService.CanProcessDocumentAsync(userId);

        // Assert
        Assert.False(result);
    }

    [Theory]
    [InlineData(SubscriptionTier.Free, 24, true)]
    [InlineData(SubscriptionTier.Free, 25, false)]
    [InlineData(SubscriptionTier.Starter, 99, true)]
    [InlineData(SubscriptionTier.Starter, 100, false)]
    [InlineData(SubscriptionTier.Growth, 499, true)]
    [InlineData(SubscriptionTier.Growth, 500, false)]
    [InlineData(SubscriptionTier.Pro, 1999, true)]
    [InlineData(SubscriptionTier.Pro, 2000, false)]
    public async Task CanProcessDocumentAsync_VariousTiersAndCounts_ReturnsExpectedResult(
        SubscriptionTier tier, int documentsProcessed, bool expectedResult)
    {
        // Arrange
        var userId = "user-123";
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            SubscriptionTier = tier,
            DocumentsProcessedThisMonth = documentsProcessed
        };

        _userManagerMock.Setup(um => um.FindByIdAsync(userId))
            .ReturnsAsync(user);

        // Act
        var result = await _subscriptionService.CanProcessDocumentAsync(userId);

        // Assert
        Assert.Equal(expectedResult, result);
    }

    #endregion

    #region IncrementDocumentCountAsync Tests

    [Fact]
    public async Task IncrementDocumentCountAsync_WithValidUser_IncrementsCount()
    {
        // Arrange
        var userId = "user-123";
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            SubscriptionTier = SubscriptionTier.Free,
            DocumentsProcessedThisMonth = 10
        };

        _userManagerMock.Setup(um => um.FindByIdAsync(userId))
            .ReturnsAsync(user);

        _userManagerMock.Setup(um => um.UpdateAsync(It.IsAny<User>()))
            .ReturnsAsync(IdentityResult.Success);

        // Act
        await _subscriptionService.IncrementDocumentCountAsync(userId);

        // Assert
        _userManagerMock.Verify(um => um.UpdateAsync(
            It.Is<User>(u => u.DocumentsProcessedThisMonth == 11)), Times.Once);
    }

    [Fact]
    public async Task IncrementDocumentCountAsync_WithInvalidUser_DoesNothing()
    {
        // Arrange
        var userId = "invalid-user";

        _userManagerMock.Setup(um => um.FindByIdAsync(userId))
            .ReturnsAsync((User?)null);

        // Act
        await _subscriptionService.IncrementDocumentCountAsync(userId);

        // Assert
        _userManagerMock.Verify(um => um.UpdateAsync(It.IsAny<User>()), Times.Never);
    }

    #endregion

    #region CancelSubscriptionAsync Tests

    [Fact]
    public async Task CancelSubscriptionAsync_WithNoActiveSubscription_ReturnsFalse()
    {
        // Arrange
        var userId = "user-123";

        // Act
        var result = await _subscriptionService.CancelSubscriptionAsync(userId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task CancelSubscriptionAsync_WithCancelledSubscription_ReturnsFalse()
    {
        // Arrange
        var userId = "user-123";
        var subscription = new Subscription
        {
            UserId = userId,
            Tier = SubscriptionTier.Starter,
            Status = SubscriptionStatus.Cancelled, // Already cancelled
            StripeSubscriptionId = "sub_123"
        };

        _context.Subscriptions.Add(subscription);
        await _context.SaveChangesAsync();

        // Act
        var result = await _subscriptionService.CancelSubscriptionAsync(userId);

        // Assert
        Assert.False(result);
    }

    #endregion

    #region GetAvailableTiers Tests

    [Fact]
    public void GetAvailableTiers_ReturnsAllTiers()
    {
        // Act
        var tiers = _subscriptionService.GetAvailableTiers();

        // Assert
        Assert.Equal(4, tiers.Count);
        Assert.Contains(tiers, t => t.Tier == SubscriptionTier.Free);
        Assert.Contains(tiers, t => t.Tier == SubscriptionTier.Starter);
        Assert.Contains(tiers, t => t.Tier == SubscriptionTier.Growth);
        Assert.Contains(tiers, t => t.Tier == SubscriptionTier.Pro);
    }

    [Fact]
    public void GetAvailableTiers_FreeTier_HasCorrectValues()
    {
        // Act
        var tiers = _subscriptionService.GetAvailableTiers();
        var freeTier = tiers.First(t => t.Tier == SubscriptionTier.Free);

        // Assert
        Assert.Equal("Free", freeTier.Name);
        Assert.Equal(25, freeTier.DocumentLimit);
        Assert.Equal(0m, freeTier.MonthlyPrice);
        Assert.NotEmpty(freeTier.Features);
    }

    [Fact]
    public void GetAvailableTiers_StarterTier_HasCorrectValues()
    {
        // Act
        var tiers = _subscriptionService.GetAvailableTiers();
        var starterTier = tiers.First(t => t.Tier == SubscriptionTier.Starter);

        // Assert
        Assert.Equal("Starter", starterTier.Name);
        Assert.Equal(100, starterTier.DocumentLimit);
        Assert.Equal(29m, starterTier.MonthlyPrice);
        Assert.NotEmpty(starterTier.Features);
    }

    [Fact]
    public void GetAvailableTiers_GrowthTier_HasCorrectValues()
    {
        // Act
        var tiers = _subscriptionService.GetAvailableTiers();
        var growthTier = tiers.First(t => t.Tier == SubscriptionTier.Growth);

        // Assert
        Assert.Equal("Growth", growthTier.Name);
        Assert.Equal(500, growthTier.DocumentLimit);
        Assert.Equal(99m, growthTier.MonthlyPrice);
        Assert.NotEmpty(growthTier.Features);
    }

    [Fact]
    public void GetAvailableTiers_ProTier_HasCorrectValues()
    {
        // Act
        var tiers = _subscriptionService.GetAvailableTiers();
        var proTier = tiers.First(t => t.Tier == SubscriptionTier.Pro);

        // Assert
        Assert.Equal("Pro", proTier.Name);
        Assert.Equal(2000, proTier.DocumentLimit);
        Assert.Equal(299m, proTier.MonthlyPrice);
        Assert.NotEmpty(proTier.Features);
    }

    #endregion

    #region CreateCheckoutSessionAsync Tests

    [Fact]
    public async Task CreateCheckoutSessionAsync_WithFreeTier_ThrowsException()
    {
        // Arrange
        var userId = "user-123";

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _subscriptionService.CreateCheckoutSessionAsync(userId, SubscriptionTier.Free));
    }

    [Fact]
    public async Task CreateCheckoutSessionAsync_WithInvalidUser_ThrowsException()
    {
        // Arrange
        var userId = "invalid-user";

        _userManagerMock.Setup(um => um.FindByIdAsync(userId))
            .ReturnsAsync((User?)null);

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _subscriptionService.CreateCheckoutSessionAsync(userId, SubscriptionTier.Starter));
    }

    #endregion
}
