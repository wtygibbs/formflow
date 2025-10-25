using AcordParser.API.Middleware;
using AcordParser.Core.DTOs;
using AcordParser.Core.Entities;
using AcordParser.Core.Interfaces;
using AcordParser.Infrastructure.Data;
using AcordParser.Infrastructure.Services;
using Azure.Storage.Blobs;
using HealthChecks.Azure.Storage.Blobs;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.RateLimiting;

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(new ConfigurationBuilder()
        .AddJsonFile("appsettings.json")
        .AddJsonFile($"appsettings.{Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production"}.json", optional: true)
        .Build())
    .Enrich.FromLogContext()
    .Enrich.WithMachineName()
    .Enrich.WithThreadId()
    .Enrich.WithEnvironmentName()
    .CreateLogger();

try
{
    Log.Information("Starting ACORD Parser API");

var builder = WebApplication.CreateBuilder(args);

// Add Serilog
builder.Host.UseSerilog();

// Add services to the container
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Configure Identity
builder.Services.AddIdentity<User, IdentityRole>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = true;
    options.Password.RequiredLength = 8;
    options.User.RequireUniqueEmail = true;
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders();

// Configure JWT authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured");
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

builder.Services.AddAuthorization();

// Register application services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IDocumentService, DocumentService>();
builder.Services.AddScoped<ISubscriptionService, SubscriptionService>();
builder.Services.AddScoped<IBlobStorageService, BlobStorageService>();
builder.Services.AddScoped<IAzureDocumentIntelligenceService, AzureDocumentIntelligenceService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<INotificationService, AcordParser.API.Services.SignalRNotificationService>();

// Register background task queue (singleton - shared across the app)
var queueCapacity = builder.Configuration.GetValue<int>("BackgroundProcessing:QueueCapacity", 100);
builder.Services.AddSingleton<IBackgroundTaskQueue>(sp => new AcordParser.Infrastructure.Services.BackgroundTaskQueue(queueCapacity));

// Register background processing service
var maxConcurrency = builder.Configuration.GetValue<int>("BackgroundProcessing:MaxConcurrency", 3);
builder.Services.AddHostedService(sp =>
{
    var queue = sp.GetRequiredService<IBackgroundTaskQueue>();
    var logger = sp.GetRequiredService<ILogger<AcordParser.Infrastructure.Services.DocumentProcessingService>>();
    return new DocumentProcessingService(queue, sp, logger, maxConcurrency);
});

// Add SignalR
builder.Services.AddSignalR();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.WithOrigins(builder.Configuration["App:FrontendUrl"] ?? "http://localhost:4200")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// Add Health Checks
builder.Services.AddHealthChecks()
    .AddSqlServer(
        connectionString: builder.Configuration.GetConnectionString("DefaultConnection") ?? string.Empty,
        name: "database",
        failureStatus: HealthStatus.Unhealthy,
        tags: new[] { "db", "sql", "sqlserver" })
    .AddAzureBlobStorage(
        clientFactory: sp =>
        {
            var connectionString = builder.Configuration["AzureStorage:ConnectionString"] 
                ?? throw new InvalidOperationException("Azure Blob Storage connection string not configured");
            return new BlobServiceClient(connectionString);
        },
        optionsFactory: sp => new AzureBlobStorageHealthCheckOptions()
        {
            ContainerName = "documents"
        }, 
        failureStatus: HealthStatus.Degraded,
        tags: new[] { "azure", "storage" })
    .AddCheck("self", () => HealthCheckResult.Healthy("API is running"), tags: new[] { "api" });

// Add Rate Limiting
builder.Services.AddRateLimiter(options =>
{
    // Global rate limit
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.User.Identity?.Name ?? context.Request.Headers.Host.ToString(),
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1)
            }));

    // Authentication endpoints - stricter limits
    options.AddPolicy("auth", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1)
            }));

    // Document upload - moderate limits
    options.AddPolicy("upload", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.User.Identity?.Name ?? context.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1)
            }));

    // API endpoints - generous limits for authenticated users
    options.AddPolicy("api", context =>
        RateLimitPartition.GetTokenBucketLimiter(
            partitionKey: context.User.Identity?.Name ?? context.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
            factory: partition => new TokenBucketRateLimiterOptions
            {
                AutoReplenishment = true,
                TokenLimit = 50,
                ReplenishmentPeriod = TimeSpan.FromMinutes(1),
                TokensPerPeriod = 50
            }));

    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        await context.HttpContext.Response.WriteAsJsonAsync(new
        {
            error = "Too many requests. Please try again later.",
            retryAfter = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter) ? retryAfter.TotalSeconds : default(double?)
        }, cancellationToken);
    };
});

// Add Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "ACORD Parser API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
app.UseGlobalExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowAngular");

// Add request logging
app.UseSerilogRequestLogging(options =>
{
    options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
    {
        diagnosticContext.Set("RequestHost", httpContext.Request.Host.Value);
        diagnosticContext.Set("RequestScheme", httpContext.Request.Scheme);
        diagnosticContext.Set("UserAgent", httpContext.Request.Headers["User-Agent"].ToString());
        if (httpContext.User.Identity?.IsAuthenticated == true)
        {
            diagnosticContext.Set("UserId", httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
        }
    };
});

app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

// Helper method to get user ID from claims
string GetUserId(ClaimsPrincipal user)
{
    return user.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? user.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
        ?? throw new UnauthorizedAccessException("User ID not found in token");
}

// ==================== AUTH ENDPOINTS ====================

app.MapPost("/api/auth/register", async (RegisterRequest request, IAuthService authService) =>
{
    var (success, error) = await authService.RegisterAsync(request);
    return success ? Results.Ok(new { message = "Registration successful" }) : Results.BadRequest(new { error });
})
.WithName("Register")
.WithTags("Authentication")
.RequireRateLimiting("auth");

app.MapPost("/api/auth/login", async (LoginRequest request, IAuthService authService, HttpContext httpContext) =>
{
    var ipAddress = httpContext.Connection.RemoteIpAddress?.ToString();
    var userAgent = httpContext.Request.Headers.UserAgent.ToString();

    var (success, response, error) = await authService.LoginAsync(request, ipAddress, userAgent);

    if (success && response != null && !response.TwoFactorRequired && response.RefreshToken != null)
    {
        // Set refresh token as httpOnly cookie
        httpContext.Response.Cookies.Append("refreshToken", response.RefreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = true, // Only send over HTTPS
            SameSite = SameSiteMode.Strict,
            Expires = DateTimeOffset.UtcNow.AddDays(7)
        });
    }

    return success ? Results.Ok(response) : Results.BadRequest(new { error });
})
.WithName("Login")
.WithTags("Authentication")
.RequireRateLimiting("auth");

app.MapPost("/api/auth/2fa/enable", async (Enable2FARequest request, IAuthService authService, ClaimsPrincipal user) =>
{
    var userId = GetUserId(user);
    var (success, response, error) = await authService.Enable2FAAsync(userId, request.Password);
    return success ? Results.Ok(response) : Results.BadRequest(new { error });
})
.RequireAuthorization()
.WithName("Enable2FA")
.WithTags("Authentication");

app.MapPost("/api/auth/2fa/verify", async (Verify2FARequest request, IAuthService authService, ClaimsPrincipal user) =>
{
    var userId = GetUserId(user);
    var (success, error) = await authService.Verify2FAAsync(userId, request.Code);
    return success ? Results.Ok(new { message = "2FA enabled successfully" }) : Results.BadRequest(new { error });
})
.RequireAuthorization()
.WithName("Verify2FA")
.WithTags("Authentication");

app.MapPost("/api/auth/2fa/disable", async (Enable2FARequest request, IAuthService authService, ClaimsPrincipal user) =>
{
    var userId = GetUserId(user);
    var (success, error) = await authService.Disable2FAAsync(userId, request.Password);
    return success ? Results.Ok(new { message = "2FA disabled successfully" }) : Results.BadRequest(new { error });
})
.RequireAuthorization()
.WithName("Disable2FA")
.WithTags("Authentication");

app.MapPost("/api/auth/forgot-password", async (ForgotPasswordRequest request, IAuthService authService) =>
{
    var (success, error) = await authService.ForgotPasswordAsync(request);
    // Always return success to prevent email enumeration
    return Results.Ok(new { message = "If your email is registered, you will receive a password reset link shortly." });
})
.WithName("ForgotPassword")
.WithTags("Authentication")
.RequireRateLimiting("auth");

app.MapPost("/api/auth/reset-password", async (ResetPasswordRequest request, IAuthService authService) =>
{
    var (success, error) = await authService.ResetPasswordAsync(request);
    return success ? Results.Ok(new { message = "Password reset successfully" }) : Results.BadRequest(new { error });
})
.WithName("ResetPassword")
.WithTags("Authentication")
.RequireRateLimiting("auth");

app.MapPost("/api/auth/change-password", async (ChangePasswordRequest request, IAuthService authService, ClaimsPrincipal user) =>
{
    var userId = GetUserId(user);
    var (success, error) = await authService.ChangePasswordAsync(userId, request);
    return success ? Results.Ok(new { message = "Password changed successfully" }) : Results.BadRequest(new { error });
})
.RequireAuthorization()
.WithName("ChangePassword")
.WithTags("Authentication");

app.MapPost("/api/auth/refresh", async (IAuthService authService, HttpContext httpContext) =>
{
    var refreshToken = httpContext.Request.Cookies["refreshToken"];
    if (string.IsNullOrEmpty(refreshToken))
    {
        return Results.BadRequest(new { error = "Refresh token not found" });
    }

    var ipAddress = httpContext.Connection.RemoteIpAddress?.ToString();
    var userAgent = httpContext.Request.Headers.UserAgent.ToString();

    var (success, response, error) = await authService.RefreshTokenAsync(refreshToken, ipAddress, userAgent);

    if (success && response != null)
    {
        // Set new refresh token as httpOnly cookie
        httpContext.Response.Cookies.Append("refreshToken", response.RefreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Expires = DateTimeOffset.UtcNow.AddDays(7)
        });

        return Results.Ok(new { token = response.Token });
    }

    return Results.BadRequest(new { error });
})
.WithName("RefreshToken")
.WithTags("Authentication");

app.MapPost("/api/auth/revoke", async (IAuthService authService, HttpContext httpContext) =>
{
    var refreshToken = httpContext.Request.Cookies["refreshToken"];
    if (string.IsNullOrEmpty(refreshToken))
    {
        return Results.BadRequest(new { error = "Refresh token not found" });
    }

    var (success, error) = await authService.RevokeTokenAsync(refreshToken);

    if (success)
    {
        // Clear the refresh token cookie
        httpContext.Response.Cookies.Delete("refreshToken");
        return Results.Ok(new { message = "Token revoked successfully" });
    }

    return Results.BadRequest(new { error });
})
.RequireAuthorization()
.WithName("RevokeToken")
.WithTags("Authentication");

// ==================== USER ENDPOINTS ====================

app.MapGet("/api/user/profile", async (UserManager<User> userManager, ApplicationDbContext context, ClaimsPrincipal claimsPrincipal) =>
{
    var userId = GetUserId(claimsPrincipal);
    var user = await userManager.FindByIdAsync(userId);

    if (user == null)
    {
        return Results.NotFound();
    }

    // Get or create user preferences
    var preferences = await context.UserPreferences.FirstOrDefaultAsync(p => p.UserId == userId);
    if (preferences == null)
    {
        preferences = new UserPreferences { UserId = userId };
        context.UserPreferences.Add(preferences);
        await context.SaveChangesAsync();
    }

    return Results.Ok(new
    {
        email = user.Email,
        displayName = user.DisplayName,
        profilePictureUrl = user.ProfilePictureUrl,
        createdAt = user.CreatedAt,
        lastLoginAt = user.LastLoginAt,
        subscriptionTier = user.SubscriptionTier.ToString(),
        documentsProcessedThisMonth = user.DocumentsProcessedThisMonth,
        twoFactorEnabled = user.TwoFactorEnabled,
        preferences = new
        {
            theme = preferences.Theme,
            emailNotifications = preferences.EmailNotifications,
            documentProcessingNotifications = preferences.DocumentProcessingNotifications,
            defaultExportFormat = preferences.DefaultExportFormat
        }
    });
})
.RequireAuthorization()
.WithName("GetUserProfile")
.WithTags("User");

app.MapPut("/api/user/profile", async (UpdateProfileRequest request, UserManager<User> userManager, ClaimsPrincipal claimsPrincipal) =>
{
    var userId = GetUserId(claimsPrincipal);
    var user = await userManager.FindByIdAsync(userId);

    if (user == null)
    {
        return Results.NotFound();
    }

    if (request.DisplayName != null)
    {
        user.DisplayName = request.DisplayName;
    }

    if (request.ProfilePictureUrl != null)
    {
        user.ProfilePictureUrl = request.ProfilePictureUrl;
    }

    var result = await userManager.UpdateAsync(user);
    if (!result.Succeeded)
    {
        return Results.BadRequest(new { error = "Failed to update profile" });
    }

    return Results.Ok(new { message = "Profile updated successfully" });
})
.RequireAuthorization()
.WithName("UpdateUserProfile")
.WithTags("User");

app.MapPut("/api/user/preferences", async (UpdatePreferencesRequest request, ApplicationDbContext context, ClaimsPrincipal claimsPrincipal) =>
{
    var userId = GetUserId(claimsPrincipal);

    // Get or create user preferences
    var preferences = await context.UserPreferences.FirstOrDefaultAsync(p => p.UserId == userId);
    if (preferences == null)
    {
        preferences = new UserPreferences { UserId = userId };
        context.UserPreferences.Add(preferences);
    }

    // Update only the provided fields
    if (request.Theme != null)
    {
        preferences.Theme = request.Theme;
    }

    if (request.EmailNotifications.HasValue)
    {
        preferences.EmailNotifications = request.EmailNotifications.Value;
    }

    if (request.DocumentProcessingNotifications.HasValue)
    {
        preferences.DocumentProcessingNotifications = request.DocumentProcessingNotifications.Value;
    }

    if (request.DefaultExportFormat != null)
    {
        preferences.DefaultExportFormat = request.DefaultExportFormat;
    }

    preferences.UpdatedAt = DateTime.UtcNow;
    await context.SaveChangesAsync();

    return Results.Ok(new
    {
        message = "Preferences updated successfully",
        preferences = new
        {
            theme = preferences.Theme,
            emailNotifications = preferences.EmailNotifications,
            documentProcessingNotifications = preferences.DocumentProcessingNotifications,
            defaultExportFormat = preferences.DefaultExportFormat
        }
    });
})
.RequireAuthorization()
.WithName("UpdateUserPreferences")
.WithTags("User");

// ==================== NOTIFICATION ENDPOINTS ====================

app.MapGet("/api/notifications", async (ApplicationDbContext context, ClaimsPrincipal user, int limit = 50) =>
{
    var userId = GetUserId(user);

    var notifications = await context.Notifications
        .Where(n => n.UserId == userId)
        .OrderByDescending(n => n.CreatedAt)
        .Take(limit)
        .Select(n => new NotificationResponse(
            n.Id,
            n.Title,
            n.Message,
            n.Type.ToString(),
            n.IsRead,
            n.CreatedAt,
            n.ReadAt,
            n.RelatedEntityId,
            n.ActionUrl
        ))
        .ToListAsync();

    return Results.Ok(notifications);
})
.RequireAuthorization()
.WithName("GetNotifications")
.WithTags("Notifications");

app.MapGet("/api/notifications/unread-count", async (ApplicationDbContext context, ClaimsPrincipal user) =>
{
    var userId = GetUserId(user);

    var unreadCount = await context.Notifications
        .Where(n => n.UserId == userId && !n.IsRead)
        .CountAsync();

    return Results.Ok(new { unreadCount });
})
.RequireAuthorization()
.WithName("GetUnreadCount")
.WithTags("Notifications");

app.MapPost("/api/notifications/{notificationId}/read", async (Guid notificationId, ApplicationDbContext context, ClaimsPrincipal user) =>
{
    var userId = GetUserId(user);

    var notification = await context.Notifications
        .Where(n => n.Id == notificationId && n.UserId == userId)
        .FirstOrDefaultAsync();

    if (notification == null)
    {
        return Results.NotFound();
    }

    if (!notification.IsRead)
    {
        notification.IsRead = true;
        notification.ReadAt = DateTime.UtcNow;
        await context.SaveChangesAsync();
    }

    return Results.Ok(new { message = "Notification marked as read" });
})
.RequireAuthorization()
.WithName("MarkNotificationRead")
.WithTags("Notifications");

app.MapPost("/api/notifications/mark-all-read", async (ApplicationDbContext context, ClaimsPrincipal user) =>
{
    var userId = GetUserId(user);

    var unreadNotifications = await context.Notifications
        .Where(n => n.UserId == userId && !n.IsRead)
        .ToListAsync();

    foreach (var notification in unreadNotifications)
    {
        notification.IsRead = true;
        notification.ReadAt = DateTime.UtcNow;
    }

    await context.SaveChangesAsync();

    return Results.Ok(new { message = $"{unreadNotifications.Count} notifications marked as read" });
})
.RequireAuthorization()
.WithName("MarkAllNotificationsRead")
.WithTags("Notifications");

app.MapDelete("/api/notifications/{notificationId}", async (Guid notificationId, ApplicationDbContext context, ClaimsPrincipal user) =>
{
    var userId = GetUserId(user);

    var notification = await context.Notifications
        .Where(n => n.Id == notificationId && n.UserId == userId)
        .FirstOrDefaultAsync();

    if (notification == null)
    {
        return Results.NotFound();
    }

    context.Notifications.Remove(notification);
    await context.SaveChangesAsync();

    return Results.Ok(new { message = "Notification deleted" });
})
.RequireAuthorization()
.WithName("DeleteNotification")
.WithTags("Notifications");

app.MapDelete("/api/notifications/clear-all", async (ApplicationDbContext context, ClaimsPrincipal user) =>
{
    var userId = GetUserId(user);

    var notifications = await context.Notifications
        .Where(n => n.UserId == userId)
        .ToListAsync();

    context.Notifications.RemoveRange(notifications);
    await context.SaveChangesAsync();

    return Results.Ok(new { message = $"{notifications.Count} notifications deleted" });
})
.RequireAuthorization()
.WithName("ClearAllNotifications")
.WithTags("Notifications");

// ==================== DOCUMENT ENDPOINTS ====================

app.MapPost("/api/documents/upload", async (HttpRequest request, IDocumentService documentService, ClaimsPrincipal user) =>
{
    var userId = GetUserId(user);
    var file = request.Form.Files.FirstOrDefault();

    if (file == null)
    {
        return Results.BadRequest(new { error = "No file provided" });
    }

    try
    {
        var response = await documentService.UploadDocumentAsync(userId, file);
        return Results.Ok(response);
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("UploadDocument")
.WithTags("Documents")
.DisableAntiforgery()
.RequireRateLimiting("upload");

app.MapGet("/api/documents", async (IDocumentService documentService, ClaimsPrincipal user) =>
{
    var userId = GetUserId(user);
    var documents = await documentService.GetUserDocumentsAsync(userId);
    return Results.Ok(documents);
})
.RequireAuthorization()
.WithName("GetDocuments")
.WithTags("Documents");

app.MapGet("/api/documents/paginated", async (
    IDocumentService documentService,
    ClaimsPrincipal user,
    int page = 1,
    int pageSize = 10,
    string? search = null,
    string? status = null,
    DateTime? fromDate = null,
    DateTime? toDate = null,
    string? sortBy = "UploadedAt",
    string? sortOrder = "desc",
    double? minConfidence = null,
    string? fileTypes = null,
    int? minFieldCount = null,
    int? maxFieldCount = null) =>
{
    var userId = GetUserId(user);
    var request = new PaginationRequest
    {
        Page = page,
        PageSize = pageSize,
        Search = search,
        Status = status,
        FromDate = fromDate,
        ToDate = toDate,
        SortBy = sortBy,
        SortOrder = sortOrder,
        MinConfidence = minConfidence,
        FileTypes = fileTypes,
        MinFieldCount = minFieldCount,
        MaxFieldCount = maxFieldCount
    };
    var documents = await documentService.GetUserDocumentsPaginatedAsync(userId, request);
    return Results.Ok(documents);
})
.RequireAuthorization()
.WithName("GetDocumentsPaginated")
.WithTags("Documents");

app.MapGet("/api/documents/{documentId}", async (Guid documentId, IDocumentService documentService, ClaimsPrincipal user) =>
{
    var userId = GetUserId(user);
    var document = await documentService.GetDocumentDetailAsync(documentId, userId);
    return document != null ? Results.Ok(document) : Results.NotFound();
})
.RequireAuthorization()
.WithName("GetDocument")
.WithTags("Documents");

app.MapPut("/api/documents/fields/{fieldId}", async (Guid fieldId, UpdateFieldRequest request, IDocumentService documentService, ClaimsPrincipal user) =>
{
    var userId = GetUserId(user);
    var success = await documentService.UpdateExtractedFieldAsync(fieldId, userId, request);
    return success ? Results.Ok(new { message = "Field updated successfully" }) : Results.NotFound();
})
.RequireAuthorization()
.WithName("UpdateField")
.WithTags("Documents");

app.MapGet("/api/documents/{documentId}/export", async (Guid documentId, IDocumentService documentService, ClaimsPrincipal user) =>
{
    var userId = GetUserId(user);

    try
    {
        var csvData = await documentService.ExportToCsvAsync(documentId, userId);
        return Results.File(csvData, "text/csv", $"acord_125_{documentId}.csv");
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("ExportDocument")
.WithTags("Documents");

app.MapGet("/api/documents/{documentId}/file", async (Guid documentId, IDocumentService documentService, IBlobStorageService blobStorage, ClaimsPrincipal user, ILogger<Program> logger) =>
{
    var userId = GetUserId(user);

    try
    {
        logger.LogInformation("Fetching document file for documentId: {DocumentId}, userId: {UserId}", documentId, userId);

        var document = await documentService.GetDocumentDetailAsync(documentId, userId);
        if (document == null)
        {
            logger.LogWarning("Document not found: {DocumentId}", documentId);
            return Results.NotFound(new { error = "Document not found" });
        }

        if (string.IsNullOrEmpty(document.FileUrl))
        {
            logger.LogWarning("Document has no file URL: {DocumentId}", documentId);
            return Results.NotFound(new { error = "Document file not found" });
        }

        logger.LogInformation("Downloading blob from: {BlobUrl}", document.FileUrl);

        // Download the file from blob storage and stream it to the client
        var fileStream = await blobStorage.DownloadFileAsync(document.FileUrl);

        // Determine content type based on file extension
        var extension = Path.GetExtension(document.FileName).ToLowerInvariant();
        var contentType = extension switch
        {
            ".pdf" => "application/pdf",
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".tiff" or ".tif" => "image/tiff",
            _ => "application/octet-stream"
        };

        logger.LogInformation("Streaming file with content type: {ContentType}", contentType);

        return Results.Stream(fileStream, contentType, enableRangeProcessing: true);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error fetching document file: {DocumentId}", documentId);
        return Results.Problem(
            detail: ex.Message,
            statusCode: 500,
            title: "Failed to fetch document file"
        );
    }
})
.RequireAuthorization()
.WithName("GetDocumentFile")
.WithTags("Documents");

app.MapGet("/api/documents/dashboard/metrics", async (IDocumentService documentService, ClaimsPrincipal user) =>
{
    var userId = GetUserId(user);
    var metrics = await documentService.GetDashboardMetricsAsync(userId);
    return Results.Ok(metrics);
})
.RequireAuthorization()
.WithName("GetDashboardMetrics")
.WithTags("Documents");

// ==================== SUBSCRIPTION ENDPOINTS ====================

app.MapGet("/api/subscription", async (ISubscriptionService subscriptionService, ClaimsPrincipal user) =>
{
    var userId = GetUserId(user);
    var subscription = await subscriptionService.GetUserSubscriptionAsync(userId);
    return Results.Ok(subscription);
})
.RequireAuthorization()
.WithName("GetSubscription")
.WithTags("Subscription");

app.MapGet("/api/subscription/tiers", (ISubscriptionService subscriptionService) =>
{
    var tiers = subscriptionService.GetAvailableTiers();
    return Results.Ok(tiers);
})
.WithName("GetSubscriptionTiers")
.WithTags("Subscription");

app.MapPost("/api/subscription/checkout", async (CreateCheckoutSessionRequest request, ISubscriptionService subscriptionService, ClaimsPrincipal user) =>
{
    var userId = GetUserId(user);

    try
    {
        var response = await subscriptionService.CreateCheckoutSessionAsync(userId, request.Tier);
        return Results.Ok(response);
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("CreateCheckoutSession")
.WithTags("Subscription");

app.MapPost("/api/subscription/cancel", async (ISubscriptionService subscriptionService, ClaimsPrincipal user) =>
{
    var userId = GetUserId(user);
    var success = await subscriptionService.CancelSubscriptionAsync(userId);
    return success ? Results.Ok(new { message = "Subscription cancelled successfully" }) : Results.NotFound();
})
.RequireAuthorization()
.WithName("CancelSubscription")
.WithTags("Subscription");

app.MapPost("/api/webhooks/stripe", async (HttpRequest request, ISubscriptionService subscriptionService) =>
{
    var json = await new StreamReader(request.Body).ReadToEndAsync();
    var signature = request.Headers["Stripe-Signature"].ToString();

    var success = await subscriptionService.HandleWebhookAsync(json, signature);
    return success ? Results.Ok() : Results.BadRequest();
})
.WithName("StripeWebhook")
.WithTags("Webhooks");

// ==================== HEALTH CHECK ====================

app.MapHealthChecks("/api/health", new HealthCheckOptions
{
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        var response = new
        {
            status = report.Status.ToString(),
            timestamp = DateTime.UtcNow,
            duration = report.TotalDuration,
            checks = report.Entries.Select(e => new
            {
                name = e.Key,
                status = e.Value.Status.ToString(),
                description = e.Value.Description,
                duration = e.Value.Duration,
                exception = e.Value.Exception?.Message,
                data = e.Value.Data,
                tags = e.Value.Tags
            })
        };
        await context.Response.WriteAsync(JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = true
        }));
    }
})
.WithName("HealthCheck")
.WithTags("Health")
.AllowAnonymous();

app.MapHealthChecks("/api/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("db")
})
.WithName("ReadinessCheck")
.WithTags("Health")
.AllowAnonymous();

app.MapHealthChecks("/api/health/live", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("api")
})
.WithName("LivenessCheck")
.WithTags("Health")
.AllowAnonymous();

// ==================== SIGNALR HUBS ====================

app.MapHub<AcordParser.API.Hubs.DocumentProcessingHub>("/hubs/document-processing");

Log.Information("ACORD Parser API started successfully");
app.Run();

}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

// Make the implicit Program class public for testing
public partial class Program { }
