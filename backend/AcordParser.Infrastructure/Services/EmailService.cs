using AcordParser.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SendGrid;
using SendGrid.Helpers.Mail;

namespace AcordParser.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;
    private readonly string _fromEmail;
    private readonly string _fromName;
    private readonly SendGridClient? _client;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;

        _fromEmail = _configuration["Email:FromEmail"] ?? "noreply@acordparser.com";
        _fromName = _configuration["Email:FromName"] ?? "ACORD Parser";

        var apiKey = _configuration["Email:SendGridApiKey"];
        if (!string.IsNullOrEmpty(apiKey))
        {
            _client = new SendGridClient(apiKey);
        }
        else
        {
            _logger.LogWarning("SendGrid API Key not configured. Email functionality will be disabled.");
        }
    }

    public async Task SendEmailAsync(string to, string subject, string htmlBody)
    {
        if (_client == null)
        {
            _logger.LogWarning("Email send skipped - SendGrid not configured. To: {To}, Subject: {Subject}", to, subject);
            return;
        }

        try
        {
            var from = new EmailAddress(_fromEmail, _fromName);
            var recipient = new EmailAddress(to);
            var msg = MailHelper.CreateSingleEmail(from, recipient, subject, null, htmlBody);

            var response = await _client.SendEmailAsync(msg);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Email sent successfully to {To}. Subject: {Subject}", to, subject);
            }
            else
            {
                var body = await response.Body.ReadAsStringAsync();
                _logger.LogError("Failed to send email to {To}. Status: {Status}, Body: {Body}", to, response.StatusCode, body);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception occurred while sending email to {To}", to);
            throw;
        }
    }

    public async Task SendWelcomeEmailAsync(string to, string userName)
    {
        var subject = "Welcome to ACORD Parser!";
        var htmlBody = $@"
            <html>
            <body style='font-family: Arial, sans-serif;'>
                <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                    <h1 style='color: #2563eb;'>Welcome to ACORD Parser!</h1>
                    <p>Hi {userName},</p>
                    <p>Thank you for registering with ACORD Parser. We're excited to help you streamline your document processing workflow.</p>
                    <p>You can now:</p>
                    <ul>
                        <li>Upload ACORD 125 documents for processing</li>
                        <li>Extract and verify field data</li>
                        <li>Export processed data to CSV</li>
                    </ul>
                    <p>If you have any questions or need assistance, please don't hesitate to reach out to our support team.</p>
                    <p>Best regards,<br>The ACORD Parser Team</p>
                </div>
            </body>
            </html>";

        await SendEmailAsync(to, subject, htmlBody);
    }

    public async Task SendDocumentProcessedEmailAsync(string to, string userName, string documentName, bool success)
    {
        var subject = success
            ? $"Document Processed Successfully - {documentName}"
            : $"Document Processing Failed - {documentName}";

        var htmlBody = success
            ? $@"
                <html>
                <body style='font-family: Arial, sans-serif;'>
                    <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                        <h1 style='color: #16a34a;'>Document Processed Successfully</h1>
                        <p>Hi {userName},</p>
                        <p>Your document <strong>{documentName}</strong> has been processed successfully.</p>
                        <p>You can now review the extracted fields and export the data from your dashboard.</p>
                        <p>Best regards,<br>The ACORD Parser Team</p>
                    </div>
                </body>
                </html>"
            : $@"
                <html>
                <body style='font-family: Arial, sans-serif;'>
                    <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                        <h1 style='color: #dc2626;'>Document Processing Failed</h1>
                        <p>Hi {userName},</p>
                        <p>Unfortunately, we encountered an issue while processing your document <strong>{documentName}</strong>.</p>
                        <p>Please check the document format and try again. If the problem persists, contact our support team.</p>
                        <p>Best regards,<br>The ACORD Parser Team</p>
                    </div>
                </body>
                </html>";

        await SendEmailAsync(to, subject, htmlBody);
    }

    public async Task SendSubscriptionChangedEmailAsync(string to, string userName, string tierName)
    {
        var subject = "Subscription Updated";
        var htmlBody = $@"
            <html>
            <body style='font-family: Arial, sans-serif;'>
                <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                    <h1 style='color: #2563eb;'>Subscription Updated</h1>
                    <p>Hi {userName},</p>
                    <p>Your subscription has been updated to the <strong>{tierName}</strong> plan.</p>
                    <p>Thank you for choosing ACORD Parser!</p>
                    <p>Best regards,<br>The ACORD Parser Team</p>
                </div>
            </body>
            </html>";

        await SendEmailAsync(to, subject, htmlBody);
    }
}
