using AcordParser.Core.DTOs;
using AcordParser.Core.Entities;
using AcordParser.Core.Interfaces;
using AcordParser.Infrastructure.Data;
using AcordParser.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

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
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowAngular");
app.UseAuthentication();
app.UseAuthorization();

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
.WithTags("Authentication");

app.MapPost("/api/auth/login", async (LoginRequest request, IAuthService authService) =>
{
    var (success, response, error) = await authService.LoginAsync(request);
    return success ? Results.Ok(response) : Results.BadRequest(new { error });
})
.WithName("Login")
.WithTags("Authentication");

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
.DisableAntiforgery();

app.MapGet("/api/documents", async (IDocumentService documentService, ClaimsPrincipal user) =>
{
    var userId = GetUserId(user);
    var documents = await documentService.GetUserDocumentsAsync(userId);
    return Results.Ok(documents);
})
.RequireAuthorization()
.WithName("GetDocuments")
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

app.MapGet("/api/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }))
    .WithName("HealthCheck")
    .WithTags("Health");

app.Run();
