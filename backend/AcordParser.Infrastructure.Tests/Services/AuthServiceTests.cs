using AcordParser.Core.DTOs;
using AcordParser.Core.Entities;
using AcordParser.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Moq;
using Xunit;

namespace AcordParser.Infrastructure.Tests.Services;

public class AuthServiceTests
{
    private readonly Mock<UserManager<User>> _userManagerMock;
    private readonly Mock<IConfiguration> _configurationMock;
    private readonly AuthService _authService;

    public AuthServiceTests()
    {
        // Setup UserManager mock
        var userStoreMock = new Mock<IUserStore<User>>();
        _userManagerMock = new Mock<UserManager<User>>(
            userStoreMock.Object, null, null, null, null, null, null, null, null);

        // Setup Configuration mock
        _configurationMock = new Mock<IConfiguration>();
        _configurationMock.Setup(c => c["Jwt:Key"]).Returns("ThisIsASecretKeyForTestingPurposesOnly12345678");
        _configurationMock.Setup(c => c["Jwt:Issuer"]).Returns("AcordParserTest");
        _configurationMock.Setup(c => c["Jwt:Audience"]).Returns("AcordParserAPITest");

        _authService = new AuthService(_userManagerMock.Object, _configurationMock.Object);
    }

    #region RegisterAsync Tests

    [Fact]
    public async Task RegisterAsync_WithValidRequest_ReturnsSuccess()
    {
        // Arrange
        var request = new RegisterRequest("test@example.com", "Password123!", "Password123!");

        _userManagerMock.Setup(um => um.FindByEmailAsync(It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        _userManagerMock.Setup(um => um.CreateAsync(It.IsAny<User>(), It.IsAny<string>()))
            .ReturnsAsync(IdentityResult.Success);

        // Act
        var (success, error) = await _authService.RegisterAsync(request);

        // Assert
        Assert.True(success);
        Assert.Null(error);
        _userManagerMock.Verify(um => um.CreateAsync(
            It.Is<User>(u => u.Email == request.Email && u.SubscriptionTier == SubscriptionTier.Free),
            request.Password), Times.Once);
    }

    [Fact]
    public async Task RegisterAsync_WithMismatchedPasswords_ReturnsError()
    {
        // Arrange
        var request = new RegisterRequest("test@example.com", "Password123!", "DifferentPassword123!");

        // Act
        var (success, error) = await _authService.RegisterAsync(request);

        // Assert
        Assert.False(success);
        Assert.Equal("Passwords do not match", error);
        _userManagerMock.Verify(um => um.CreateAsync(It.IsAny<User>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task RegisterAsync_WithExistingEmail_ReturnsError()
    {
        // Arrange
        var request = new RegisterRequest("existing@example.com", "Password123!", "Password123!");
        var existingUser = new User { Email = "existing@example.com", UserName = "existing@example.com" };

        _userManagerMock.Setup(um => um.FindByEmailAsync(request.Email))
            .ReturnsAsync(existingUser);

        // Act
        var (success, error) = await _authService.RegisterAsync(request);

        // Assert
        Assert.False(success);
        Assert.Equal("Email already registered", error);
        _userManagerMock.Verify(um => um.CreateAsync(It.IsAny<User>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task RegisterAsync_WhenIdentityFails_ReturnsIdentityErrors()
    {
        // Arrange
        var request = new RegisterRequest("test@example.com", "weak", "weak");
        var identityErrors = new[]
        {
            new IdentityError { Description = "Password too weak" },
            new IdentityError { Description = "Password must contain uppercase" }
        };

        _userManagerMock.Setup(um => um.FindByEmailAsync(It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        _userManagerMock.Setup(um => um.CreateAsync(It.IsAny<User>(), It.IsAny<string>()))
            .ReturnsAsync(IdentityResult.Failed(identityErrors));

        // Act
        var (success, error) = await _authService.RegisterAsync(request);

        // Assert
        Assert.False(success);
        Assert.Contains("Password too weak", error);
        Assert.Contains("Password must contain uppercase", error);
    }

    #endregion

    #region LoginAsync Tests

    [Fact]
    public async Task LoginAsync_WithValidCredentials_ReturnsSuccessWithToken()
    {
        // Arrange
        var request = new LoginRequest("test@example.com", "Password123!");
        var user = new User
        {
            Id = "user-123",
            Email = "test@example.com",
            UserName = "test@example.com",
            SubscriptionTier = SubscriptionTier.Starter,
            TwoFactorEnabled = false
        };

        _userManagerMock.Setup(um => um.FindByEmailAsync(request.Email))
            .ReturnsAsync(user);

        _userManagerMock.Setup(um => um.CheckPasswordAsync(user, request.Password))
            .ReturnsAsync(true);

        _userManagerMock.Setup(um => um.UpdateAsync(It.IsAny<User>()))
            .ReturnsAsync(IdentityResult.Success);

        // Act
        var (success, response, error) = await _authService.LoginAsync(request);

        // Assert
        Assert.True(success);
        Assert.NotNull(response);
        Assert.NotEmpty(response.Token);
        Assert.Equal(request.Email, response.Email);
        Assert.Equal(SubscriptionTier.Starter, response.SubscriptionTier);
        Assert.False(response.TwoFactorRequired);
        Assert.Null(error);

        _userManagerMock.Verify(um => um.UpdateAsync(It.Is<User>(u => u.LastLoginAt != null)), Times.Once);
    }

    [Fact]
    public async Task LoginAsync_WithInvalidEmail_ReturnsError()
    {
        // Arrange
        var request = new LoginRequest("nonexistent@example.com", "Password123!");

        _userManagerMock.Setup(um => um.FindByEmailAsync(request.Email))
            .ReturnsAsync((User?)null);

        // Act
        var (success, response, error) = await _authService.LoginAsync(request);

        // Assert
        Assert.False(success);
        Assert.Null(response);
        Assert.Equal("Invalid credentials", error);
    }

    [Fact]
    public async Task LoginAsync_WithInvalidPassword_ReturnsError()
    {
        // Arrange
        var request = new LoginRequest("test@example.com", "WrongPassword!");
        var user = new User { Email = "test@example.com", UserName = "test@example.com" };

        _userManagerMock.Setup(um => um.FindByEmailAsync(request.Email))
            .ReturnsAsync(user);

        _userManagerMock.Setup(um => um.CheckPasswordAsync(user, request.Password))
            .ReturnsAsync(false);

        // Act
        var (success, response, error) = await _authService.LoginAsync(request);

        // Assert
        Assert.False(success);
        Assert.Null(response);
        Assert.Equal("Invalid credentials", error);
    }

    [Fact]
    public async Task LoginAsync_With2FAEnabled_NoCodeProvided_Returns2FARequired()
    {
        // Arrange
        var request = new LoginRequest("test@example.com", "Password123!");
        var user = new User
        {
            Id = "user-123",
            Email = "test@example.com",
            UserName = "test@example.com",
            SubscriptionTier = SubscriptionTier.Free,
            TwoFactorEnabled = true,
            TwoFactorSecret = "TESTSECRET123456"
        };

        _userManagerMock.Setup(um => um.FindByEmailAsync(request.Email))
            .ReturnsAsync(user);

        _userManagerMock.Setup(um => um.CheckPasswordAsync(user, request.Password))
            .ReturnsAsync(true);

        // Act
        var (success, response, error) = await _authService.LoginAsync(request);

        // Assert
        Assert.True(success);
        Assert.NotNull(response);
        Assert.Empty(response.Token); // No token when 2FA is required
        Assert.True(response.TwoFactorRequired);
        Assert.Null(error);
    }

    [Fact]
    public async Task LoginAsync_With2FAEnabled_InvalidCode_ReturnsError()
    {
        // Arrange
        var request = new LoginRequest("test@example.com", "Password123!", "000000");
        var user = new User
        {
            Id = "user-123",
            Email = "test@example.com",
            UserName = "test@example.com",
            TwoFactorEnabled = true,
            TwoFactorSecret = "TESTSECRET123456"
        };

        _userManagerMock.Setup(um => um.FindByEmailAsync(request.Email))
            .ReturnsAsync(user);

        _userManagerMock.Setup(um => um.CheckPasswordAsync(user, request.Password))
            .ReturnsAsync(true);

        // Act
        var (success, response, error) = await _authService.LoginAsync(request);

        // Assert
        Assert.False(success);
        Assert.Null(response);
        Assert.Equal("Invalid two-factor code", error);
    }

    #endregion

    #region Enable2FAAsync Tests

    [Fact]
    public async Task Enable2FAAsync_WithValidPassword_ReturnsSecretAndQrCode()
    {
        // Arrange
        var userId = "user-123";
        var password = "Password123!";
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            UserName = "test@example.com"
        };

        _userManagerMock.Setup(um => um.FindByIdAsync(userId))
            .ReturnsAsync(user);

        _userManagerMock.Setup(um => um.CheckPasswordAsync(user, password))
            .ReturnsAsync(true);

        _userManagerMock.Setup(um => um.UpdateAsync(It.IsAny<User>()))
            .ReturnsAsync(IdentityResult.Success);

        // Act
        var (success, response, error) = await _authService.Enable2FAAsync(userId, password);

        // Assert
        Assert.True(success);
        Assert.NotNull(response);
        Assert.NotEmpty(response.Secret);
        Assert.Contains("chart.googleapis.com", response.QrCodeUrl);
        Assert.Contains("cht=qr", response.QrCodeUrl);
        // The otpauth URL is URL-encoded in the chl parameter
        Assert.Contains("chl=", response.QrCodeUrl);
        Assert.Null(error);

        _userManagerMock.Verify(um => um.UpdateAsync(
            It.Is<User>(u => u.TwoFactorSecret != null && !u.TwoFactorEnabled)), Times.Once);
    }

    [Fact]
    public async Task Enable2FAAsync_WithInvalidUser_ReturnsError()
    {
        // Arrange
        var userId = "invalid-user";
        var password = "Password123!";

        _userManagerMock.Setup(um => um.FindByIdAsync(userId))
            .ReturnsAsync((User?)null);

        // Act
        var (success, response, error) = await _authService.Enable2FAAsync(userId, password);

        // Assert
        Assert.False(success);
        Assert.Null(response);
        Assert.Equal("User not found", error);
    }

    [Fact]
    public async Task Enable2FAAsync_WithInvalidPassword_ReturnsError()
    {
        // Arrange
        var userId = "user-123";
        var password = "WrongPassword!";
        var user = new User { Id = userId, Email = "test@example.com" };

        _userManagerMock.Setup(um => um.FindByIdAsync(userId))
            .ReturnsAsync(user);

        _userManagerMock.Setup(um => um.CheckPasswordAsync(user, password))
            .ReturnsAsync(false);

        // Act
        var (success, response, error) = await _authService.Enable2FAAsync(userId, password);

        // Assert
        Assert.False(success);
        Assert.Null(response);
        Assert.Equal("Invalid password", error);
    }

    #endregion

    #region Verify2FAAsync Tests

    [Fact]
    public async Task Verify2FAAsync_WithInvalidUser_ReturnsError()
    {
        // Arrange
        var userId = "invalid-user";
        var code = "123456";

        _userManagerMock.Setup(um => um.FindByIdAsync(userId))
            .ReturnsAsync((User?)null);

        // Act
        var (success, error) = await _authService.Verify2FAAsync(userId, code);

        // Assert
        Assert.False(success);
        Assert.Equal("Invalid request", error);
    }

    [Fact]
    public async Task Verify2FAAsync_WithNoSecret_ReturnsError()
    {
        // Arrange
        var userId = "user-123";
        var code = "123456";
        var user = new User { Id = userId, TwoFactorSecret = null };

        _userManagerMock.Setup(um => um.FindByIdAsync(userId))
            .ReturnsAsync(user);

        // Act
        var (success, error) = await _authService.Verify2FAAsync(userId, code);

        // Assert
        Assert.False(success);
        Assert.Equal("Invalid request", error);
    }

    #endregion

    #region Disable2FAAsync Tests

    [Fact]
    public async Task Disable2FAAsync_WithValidPassword_ReturnsSuccess()
    {
        // Arrange
        var userId = "user-123";
        var password = "Password123!";
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            TwoFactorEnabled = true,
            TwoFactorSecret = "TESTSECRET123456"
        };

        _userManagerMock.Setup(um => um.FindByIdAsync(userId))
            .ReturnsAsync(user);

        _userManagerMock.Setup(um => um.CheckPasswordAsync(user, password))
            .ReturnsAsync(true);

        _userManagerMock.Setup(um => um.UpdateAsync(It.IsAny<User>()))
            .ReturnsAsync(IdentityResult.Success);

        // Act
        var (success, error) = await _authService.Disable2FAAsync(userId, password);

        // Assert
        Assert.True(success);
        Assert.Null(error);

        _userManagerMock.Verify(um => um.UpdateAsync(
            It.Is<User>(u => !u.TwoFactorEnabled && u.TwoFactorSecret == null)), Times.Once);
    }

    [Fact]
    public async Task Disable2FAAsync_WithInvalidUser_ReturnsError()
    {
        // Arrange
        var userId = "invalid-user";
        var password = "Password123!";

        _userManagerMock.Setup(um => um.FindByIdAsync(userId))
            .ReturnsAsync((User?)null);

        // Act
        var (success, error) = await _authService.Disable2FAAsync(userId, password);

        // Assert
        Assert.False(success);
        Assert.Equal("User not found", error);
    }

    [Fact]
    public async Task Disable2FAAsync_WithInvalidPassword_ReturnsError()
    {
        // Arrange
        var userId = "user-123";
        var password = "WrongPassword!";
        var user = new User { Id = userId, TwoFactorEnabled = true };

        _userManagerMock.Setup(um => um.FindByIdAsync(userId))
            .ReturnsAsync(user);

        _userManagerMock.Setup(um => um.CheckPasswordAsync(user, password))
            .ReturnsAsync(false);

        // Act
        var (success, error) = await _authService.Disable2FAAsync(userId, password);

        // Assert
        Assert.False(success);
        Assert.Equal("Invalid password", error);
    }

    #endregion

    #region GenerateJwtToken Tests

    [Fact]
    public void GenerateJwtToken_WithValidInput_ReturnsValidToken()
    {
        // Arrange
        var userId = "user-123";
        var email = "test@example.com";

        // Act
        var token = _authService.GenerateJwtToken(userId, email);

        // Assert
        Assert.NotEmpty(token);
        Assert.Contains(".", token); // JWT has multiple parts separated by dots

        // Verify token structure (header.payload.signature)
        var parts = token.Split('.');
        Assert.Equal(3, parts.Length);
    }

    [Fact]
    public void GenerateJwtToken_WithoutJwtKey_ThrowsException()
    {
        // Arrange
        var configMock = new Mock<IConfiguration>();
        configMock.Setup(c => c["Jwt:Key"]).Returns((string?)null);
        var authService = new AuthService(_userManagerMock.Object, configMock.Object);

        // Act & Assert
        Assert.Throws<InvalidOperationException>(() =>
            authService.GenerateJwtToken("user-123", "test@example.com"));
    }

    #endregion
}
