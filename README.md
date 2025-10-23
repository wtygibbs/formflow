# ACORD Parser SaaS

A full-stack SaaS application that extracts data from ACORD 125 insurance forms using Azure AI Document Intelligence. Built with .NET 9 and Angular 20.

## Features

- **AI-Powered Extraction**: Automatically extract data from ACORD 125 forms using Azure AI Document Intelligence
- **User Authentication**: Secure JWT-based authentication with optional 2FA support
- **Document Management**: Upload, process, and manage insurance documents
- **Data Review & Editing**: Review extracted fields with confidence scores and edit as needed
- **CSV Export**: Download extracted data in CSV format
- **Subscription Management**: Multiple tier support with Stripe integration
- **Responsive UI**: Modern Angular 20 frontend with standalone components and signals

## Tech Stack

### Backend
- **.NET 9**: Minimal API for high performance
- **Entity Framework Core**: Database ORM with SQL Server
- **Azure Blob Storage**: Secure document storage
- **Azure AI Document Intelligence**: Advanced form recognition
- **Stripe**: Payment processing and subscription management
- **ASP.NET Core Identity**: User authentication and authorization
- **JWT**: Token-based authentication with 2FA support

### Frontend
- **Angular 20**: Modern framework with standalone components
- **Signals**: Reactive state management
- **TypeScript**: Type-safe development
- **Stripe.js**: Payment integration

### Infrastructure
- **SQL Server**: Relational database
- **Docker**: Containerization for easy deployment
- **Azure Services**: Cloud infrastructure

## Architecture

```
formflow/
├── backend/
│   ├── AcordParser.API/          # Web API layer
│   │   ├── Program.cs             # API endpoints and configuration
│   │   └── appsettings.json       # Application settings
│   ├── AcordParser.Core/          # Domain layer
│   │   ├── Entities/              # Domain models
│   │   ├── DTOs/                  # Data transfer objects
│   │   └── Interfaces/            # Service contracts
│   └── AcordParser.Infrastructure/ # Infrastructure layer
│       ├── Data/                  # Database context
│       └── Services/              # Service implementations
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── core/              # Core services and guards
│       │   └── features/          # Feature modules
│       └── environments/          # Environment configs
└── docker-compose.yml             # Docker orchestration
```

## Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- [Node.js 20+](https://nodejs.org/)
- [SQL Server](https://www.microsoft.com/sql-server) or Docker
- [Azure Account](https://azure.microsoft.com/) (for Azure services)
- [Stripe Account](https://stripe.com/) (for payments)

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/formflow.git
cd formflow
```

### 2. Configure Azure Services

#### Azure Blob Storage
1. Create a Storage Account in Azure Portal
2. Create a container named "documents"
3. Copy the connection string

#### Azure AI Document Intelligence
1. Create a Document Intelligence resource
2. Copy the endpoint URL and API key
3. (Optional) Train a custom model for ACORD 125 forms

### 3. Configure Stripe

1. Create a Stripe account
2. Get your API keys from the dashboard
3. Create products for each subscription tier:
   - Starter: $29/month
   - Growth: $99/month
   - Pro: $299/month
4. Copy the price IDs

### 4. Setup Backend

```bash
cd backend

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env

# Update appsettings.json
cd AcordParser.API
nano appsettings.json
```

Update the following in `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Your SQL Server connection string"
  },
  "Jwt": {
    "Key": "Your-256-bit-secret-key"
  },
  "AzureStorage": {
    "ConnectionString": "Your Azure Storage connection string",
    "ContainerName": "documents"
  },
  "AzureDocumentIntelligence": {
    "Endpoint": "Your Azure endpoint",
    "ApiKey": "Your API key",
    "ModelId": "prebuilt-document"
  },
  "Stripe": {
    "SecretKey": "Your Stripe secret key",
    "PublishableKey": "Your Stripe publishable key",
    "WebhookSecret": "Your webhook secret"
  }
}
```

```bash
# Restore packages
dotnet restore

# Apply database migrations
cd AcordParser.API
dotnet ef database update

# Run the API
dotnet run
```

The API will be available at `https://localhost:5001`

### 5. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Update environment configuration
nano src/environments/environment.ts
```

Update with your Stripe publishable key:

```typescript
export const environment = {
  production: false,
  apiUrl: 'https://localhost:5001/api',
  stripePublishableKey: 'pk_test_your_key'
};
```

```bash
# Run the development server
npm start
```

The frontend will be available at `http://localhost:4200`

### 6. Using Docker (Alternative)

```bash
# Build and run all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Database Migrations

### Create a new migration

```bash
cd backend/AcordParser.API
dotnet ef migrations add MigrationName
```

### Apply migrations

```bash
dotnet ef database update
```

### Remove last migration

```bash
dotnet ef migrations remove
```

## API Documentation

Once the backend is running, visit:
- Swagger UI: `https://localhost:5001/swagger`

### Key Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/2fa/enable` - Enable 2FA
- `POST /api/auth/2fa/verify` - Verify 2FA code

#### Documents
- `POST /api/documents/upload` - Upload document
- `GET /api/documents` - Get user's documents
- `GET /api/documents/{id}` - Get document details
- `PUT /api/documents/fields/{id}` - Update extracted field
- `GET /api/documents/{id}/export` - Export to CSV

#### Subscription
- `GET /api/subscription` - Get current subscription
- `GET /api/subscription/tiers` - Get available tiers
- `POST /api/subscription/checkout` - Create checkout session
- `POST /api/subscription/cancel` - Cancel subscription

## Subscription Tiers

| Tier | Price | Documents/Month | Features |
|------|-------|-----------------|----------|
| Free | $0 | 25 | Basic extraction, CSV export |
| Starter | $29 | 100 | Advanced extraction, Priority support, 2FA |
| Growth | $99 | 500 | All Starter features + API access |
| Pro | $299 | 2000 | All Growth features + Custom integrations |

## Security Features

- ✅ HTTPS only
- ✅ JWT authentication
- ✅ Two-factor authentication (TOTP)
- ✅ File type validation
- ✅ File size limits (10MB max)
- ✅ SQL injection protection (parameterized queries)
- ✅ CORS configuration
- ✅ Password requirements enforcement

## Performance Considerations

- Document processing happens asynchronously
- Background job processing for AI extraction
- Database indexes on frequently queried fields
- Blob storage for efficient file handling
- Response caching where appropriate

## Deployment

### Azure App Service

1. Create App Service for .NET 9
2. Create App Service for static web apps (Angular)
3. Configure application settings
4. Set up CI/CD with GitHub Actions

### Docker Deployment

```bash
# Build images
docker-compose build

# Push to registry
docker tag acord-parser-api:latest your-registry/acord-parser-api:latest
docker push your-registry/acord-parser-api:latest

# Deploy to your environment
```

## Environment Variables

### Backend
- `ConnectionStrings__DefaultConnection` - SQL Server connection
- `Jwt__Key` - JWT signing key
- `AzureStorage__ConnectionString` - Azure Storage
- `AzureDocumentIntelligence__Endpoint` - AI endpoint
- `AzureDocumentIntelligence__ApiKey` - AI API key
- `Stripe__SecretKey` - Stripe secret key
- `Stripe__WebhookSecret` - Stripe webhook secret

### Frontend
- `apiUrl` - Backend API URL
- `stripePublishableKey` - Stripe publishable key

## Troubleshooting

### Database Connection Issues
- Verify SQL Server is running
- Check connection string format
- Ensure firewall allows connections

### Azure AI Not Working
- Verify endpoint and API key
- Check Azure resource location
- Ensure model ID is correct

### Stripe Webhooks
- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:5001/api/webhooks/stripe`
- Configure webhook endpoint in Stripe dashboard for production

## Development

### Running Tests

```bash
# Backend
cd backend
dotnet test

# Frontend
cd frontend
npm test
```

### Code Style

Backend follows:
- C# coding conventions
- Async/await best practices
- SOLID principles

Frontend follows:
- Angular style guide
- TypeScript strict mode
- Reactive programming with signals

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Create an issue in GitHub
- Email: support@acordparser.com

## Roadmap

- [ ] Batch document processing
- [ ] Custom field mapping
- [ ] API webhooks for document completion
- [ ] Multi-language support
- [ ] Mobile app
- [ ] Advanced analytics dashboard
- [ ] OCR quality improvements
- [ ] Support for more ACORD forms (126, 130, etc.)

## Acknowledgments

- Azure AI Document Intelligence
- .NET Team
- Angular Team
- Stripe
- Open source community