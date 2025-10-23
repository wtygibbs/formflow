# Development Guide

This guide provides detailed information for developers working on the ACORD Parser project.

## Prerequisites Installation

### 1. Install .NET 9 SDK

Download and install from [https://dotnet.microsoft.com/download/dotnet/9.0](https://dotnet.microsoft.com/download/dotnet/9.0)

Verify installation:
```bash
dotnet --version
# Should output 9.0.x
```

### 2. Install Entity Framework Core Tools

Required for database migrations:

```bash
dotnet tool install --global dotnet-ef
```

Verify installation:
```bash
dotnet ef --version
# Should output 9.0.x
```

### 3. Install Node.js and npm

Download and install from [https://nodejs.org/](https://nodejs.org/) (LTS version recommended)

Verify installation:
```bash
node --version
npm --version
```

### 4. Install Angular CLI (Optional)

```bash
npm install -g @angular/cli
```

### 5. Install SQL Server

**Option 1: Local Installation**
- Windows: Download from [Microsoft SQL Server](https://www.microsoft.com/sql-server)
- Mac/Linux: Use Docker (see Option 2)

**Option 2: Docker**
```bash
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=YourStrong@Password123" \
   -p 1433:1433 --name sql-server \
   -d mcr.microsoft.com/mssql/server:2022-latest
```

## VS Code Setup

### Recommended Extensions

The workspace includes a list of recommended extensions. Install them all:

1. Open VS Code
2. Press `Ctrl+Shift+X` / `Cmd+Shift+X`
3. Type `@recommended`
4. Click "Install All Workspace Recommendations"

### Essential Extensions

- **C# Dev Kit** - C# language support and debugging
- **Angular Language Service** - Angular template support
- **ESLint** - JavaScript/TypeScript linting
- **Docker** - Docker file support and container management
- **GitLens** - Enhanced Git integration

### Keyboard Shortcuts Reference

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Run Tasks | `Ctrl+Shift+B` | `Cmd+Shift+B` |
| Start Debugging | `F5` | `F5` |
| Command Palette | `Ctrl+Shift+P` | `Cmd+Shift+P` |
| Toggle Terminal | `Ctrl+` ` | `Cmd+` ` |
| Quick Open | `Ctrl+P` | `Cmd+P` |
| Find in Files | `Ctrl+Shift+F` | `Cmd+Shift+F` |

## Common Development Tasks

### Starting Development

**Full Stack Development:**
```bash
# Using VS Code tasks (recommended)
Press F5 → Select "🎯 Full Stack (Backend + Frontend)"

# Or manually
# Terminal 1 - Backend
cd backend/AcordParser.API
dotnet watch run

# Terminal 2 - Frontend
cd frontend
npm start
```

**Backend Only:**
```bash
# Using VS Code
Press F5 → Select "🚀 Launch Backend API"

# Or manually
cd backend/AcordParser.API
dotnet run
```

**Frontend Only:**
```bash
# Using VS Code tasks
Ctrl+Shift+P → Tasks: Run Task → "Run Frontend"

# Or manually
cd frontend
npm start
```

### Database Migrations

**Create a new migration:**
```bash
# Using VS Code
Ctrl+Shift+P → Tasks: Run Task → "📊 EF: Add Migration"
# Enter migration name when prompted

# Or manually
cd backend/AcordParser.API
dotnet ef migrations add MigrationName
```

**Apply migrations:**
```bash
# Using VS Code
Ctrl+Shift+P → Tasks: Run Task → "📊 EF: Update Database"

# Or manually
cd backend/AcordParser.API
dotnet ef database update
```

**Remove last migration:**
```bash
# Using VS Code
Ctrl+Shift+P → Tasks: Run Task → "📊 EF: Remove Last Migration"

# Or manually
cd backend/AcordParser.API
dotnet ef migrations remove
```

**View all migrations:**
```bash
# Using VS Code
Ctrl+Shift+P → Tasks: Run Task → "📊 EF: List Migrations"

# Or manually
cd backend/AcordParser.API
dotnet ef migrations list
```

**Generate SQL script:**
```bash
# Using VS Code
Ctrl+Shift+P → Tasks: Run Task → "📊 EF: Generate SQL Script"
# Creates migrations.sql in project root

# Or manually
cd backend/AcordParser.API
dotnet ef migrations script -o migrations.sql
```

### Building the Project

**Build everything:**
```bash
# Using VS Code
Ctrl+Shift+B → Select "🏗️ Build All"

# Or manually
cd backend
dotnet build

cd ../frontend
npm run build
```

**Production build:**
```bash
# Backend
cd backend
dotnet build -c Release

# Frontend
cd frontend
npm run build -- --configuration production
```

### Running Tests

**All tests:**
```bash
# Using VS Code
Ctrl+Shift+P → Tasks: Run Task → "🧪 Test All"

# Or manually
dotnet test backend/AcordParser.sln
cd frontend && npm test
```

**Backend tests only:**
```bash
cd backend
dotnet test
```

**Frontend tests only:**
```bash
cd frontend
npm test
```

**Frontend tests with coverage:**
```bash
cd frontend
npm test -- --code-coverage
```

### Docker Development

**Start all services:**
```bash
# Using VS Code
Ctrl+Shift+P → Tasks: Run Task → "🐳 Docker: Compose Up"

# Or manually
docker-compose up -d
```

**View logs:**
```bash
# Using VS Code
Ctrl+Shift+P → Tasks: Run Task → "🐳 Docker: View Logs"

# Or manually
docker-compose logs -f
```

**Stop all services:**
```bash
# Using VS Code
Ctrl+Shift+P → Tasks: Run Task → "🐳 Docker: Compose Down"

# Or manually
docker-compose down
```

**Rebuild containers:**
```bash
docker-compose down
docker-compose build
docker-compose up -d
```

## Debugging

### Backend Debugging

1. Set breakpoints in C# files (click left margin or press `F9`)
2. Press `F5` or select "🚀 Launch Backend API"
3. Code execution will pause at breakpoints
4. Use Debug Console to inspect variables
5. Step through code:
   - `F10` - Step over
   - `F11` - Step into
   - `Shift+F11` - Step out

### Frontend Debugging

1. Set breakpoints in TypeScript files
2. Press `F5` and select "🌐 Launch Frontend (Chrome)"
3. Use browser DevTools alongside VS Code debugger
4. Inspect component state in Debug panel
5. Console logs appear in Debug Console

### Full Stack Debugging

1. Press `F5` and select "🎯 Full Stack (Backend + Frontend)"
2. Set breakpoints in both backend and frontend
3. Debug API calls from frontend to backend
4. Switch between debuggers in Call Stack panel

## Code Style and Formatting

### C# Code Style

- 4 spaces for indentation
- Use `var` when type is obvious
- Follow [Microsoft C# Coding Conventions](https://docs.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/coding-conventions)
- Files auto-format on save

### TypeScript/Angular Code Style

- 2 spaces for indentation
- Use single quotes for strings
- Follow [Angular Style Guide](https://angular.io/guide/styleguide)
- ESLint runs automatically
- Files auto-format on save

### EditorConfig

The project includes an `.editorconfig` file that enforces consistent coding styles.

## Common Issues and Solutions

### Issue: EF Tools Not Found

**Solution:**
```bash
dotnet tool install --global dotnet-ef
```

### Issue: Database Connection Failed

**Solutions:**
1. Ensure SQL Server is running
2. Check connection string in `appsettings.json`
3. Verify SQL Server accepts TCP connections
4. Check firewall settings

### Issue: Frontend Build Fails

**Solutions:**
```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install

# Clear Angular cache
rm -rf .angular
```

### Issue: Backend Build Fails

**Solutions:**
```bash
# Clean and restore
cd backend
dotnet clean
dotnet restore
dotnet build
```

### Issue: CORS Errors

**Solution:**
Ensure `appsettings.json` has correct frontend URL:
```json
{
  "App": {
    "FrontendUrl": "http://localhost:4200"
  }
}
```

### Issue: Migrations Already Applied

**Solution:**
Check migration history:
```bash
dotnet ef migrations list
```

If needed, revert to specific migration:
```bash
dotnet ef database update MigrationName
```

## Git Workflow

### Branch Naming

- Feature: `feature/description`
- Bug fix: `fix/description`
- Hotfix: `hotfix/description`

### Commit Messages

Follow conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

Example:
```
feat: add user profile editing functionality

- Add ProfileController with update endpoint
- Create profile edit component
- Add profile service methods
```

### Before Committing

1. Ensure code builds: `Ctrl+Shift+B` → "🏗️ Build All"
2. Run tests: `Ctrl+Shift+P` → "🧪 Test All"
3. Check for linting errors
4. Review changes in Source Control panel

## Environment Variables

### Backend (.NET)

Located in `backend/AcordParser.API/appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=AcordParserDb;..."
  },
  "Jwt": {
    "Key": "your-secret-key",
    "Issuer": "AcordParser",
    "Audience": "AcordParserAPI"
  },
  "AzureStorage": {
    "ConnectionString": "...",
    "ContainerName": "documents"
  }
}
```

### Frontend (Angular)

Located in `frontend/src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'https://localhost:5001/api',
  stripePublishableKey: 'pk_test_...'
};
```

## Performance Profiling

### Backend Performance

Use .NET diagnostic tools:
```bash
dotnet counters monitor --process-id <PID>
dotnet trace collect --process-id <PID>
```

### Frontend Performance

1. Open Chrome DevTools
2. Go to Performance tab
3. Record while using the application
4. Analyze flame graph and identify bottlenecks

## Security Best Practices

1. **Never commit secrets** - Use environment variables or Azure Key Vault
2. **Use HTTPS** in development (already configured)
3. **Validate all inputs** on both client and server
4. **Keep dependencies updated** - Run `npm audit` and `dotnet list package --vulnerable`
5. **Use parameterized queries** - Already implemented in Entity Framework

## Additional Resources

- [.NET Documentation](https://docs.microsoft.com/en-us/dotnet/)
- [Angular Documentation](https://angular.io/docs)
- [Entity Framework Core](https://docs.microsoft.com/en-us/ef/core/)
- [VS Code Tips and Tricks](https://code.visualstudio.com/docs/getstarted/tips-and-tricks)
- [Azure Documentation](https://docs.microsoft.com/en-us/azure/)
- [Stripe API Reference](https://stripe.com/docs/api)
