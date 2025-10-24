namespace AcordParser.Core.Interfaces;

public interface IEmailService
{
    Task SendEmailAsync(string to, string subject, string htmlBody);
    Task SendWelcomeEmailAsync(string to, string userName);
    Task SendDocumentProcessedEmailAsync(string to, string userName, string documentName, bool success);
    Task SendSubscriptionChangedEmailAsync(string to, string userName, string tierName);
}
