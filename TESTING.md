# Testing Guide

This document provides comprehensive information about testing the ACORD Parser application.

## Overview

The project uses different testing frameworks for backend and frontend:

- **Backend (.NET)**: xUnit with Moq for mocking
- **Frontend (Angular)**: Jasmine/Karma for unit tests

## Backend Testing

### Test Structure

```
backend/
├── AcordParser.Infrastructure.Tests/
│   ├── Services/
│   │   ├── AuthServiceTests.cs
│   │   ├── DocumentServiceTests.cs
│   │   └── SubscriptionServiceTests.cs
│   └── GlobalUsings.cs
└── AcordParser.API.Tests/
    ├── IntegrationTests/
    │   └── HealthEndpointTests.cs
    └── GlobalUsings.cs
```

### Running Backend Tests

```bash
# Navigate to backend directory
cd backend

# Run all tests
dotnet test

# Run tests with coverage
dotnet test /p:CollectCoverage=true /p:CoverletOutputFormat=opencover

# Run specific test project
dotnet test AcordParser.Infrastructure.Tests

# Run specific test class
dotnet test --filter "FullyQualifiedName~AuthServiceTests"

# Run with detailed output
dotnet test --logger "console;verbosity=detailed"
```

### Test Coverage

The backend tests cover:

#### AuthService Tests (32 tests)
- ✅ User registration (valid, invalid, duplicate email)
- ✅ User login (valid, invalid credentials, 2FA)
- ✅ 2FA enable/verify/disable flows
- ✅ JWT token generation
- ✅ Password validation

#### DocumentService Tests (21 tests)
- ✅ Document upload (validation, file types, size limits)
- ✅ Document retrieval (list, paginated, details)
- ✅ Search and filtering
- ✅ Field extraction and updates
- ✅ CSV export
- ✅ Subscription limit checks

#### SubscriptionService Tests (18 tests)
- ✅ Subscription tier management
- ✅ Document quota tracking
- ✅ Stripe integration points
- ✅ Subscription cancellation
- ✅ Usage limits validation

#### API Integration Tests
- ✅ Health check endpoints
- ✅ Endpoint routing

### Writing New Backend Tests

Example test structure:

```csharp
using AcordParser.Infrastructure.Services;
using Moq;
using Xunit;

public class YourServiceTests : IDisposable
{
    private readonly Mock<IDependency> _dependencyMock;
    private readonly YourService _service;

    public YourServiceTests()
    {
        // Setup
        _dependencyMock = new Mock<IDependency>();
        _service = new YourService(_dependencyMock.Object);
    }

    [Fact]
    public async Task MethodName_WithCondition_ExpectedBehavior()
    {
        // Arrange
        var input = new SomeInput();
        _dependencyMock.Setup(d => d.Method()).ReturnsAsync(value);

        // Act
        var result = await _service.MethodUnderTest(input);

        // Assert
        Assert.Equal(expected, result);
        _dependencyMock.Verify(d => d.Method(), Times.Once);
    }

    public void Dispose()
    {
        // Cleanup
    }
}
```

## Frontend Testing

### Test Structure

```
frontend/src/app/
└── core/
    └── services/
        ├── auth.service.ts
        ├── auth.service.spec.ts
        ├── document.service.ts
        ├── document.service.spec.ts
        ├── signalr.service.ts
        └── signalr.service.spec.ts
```

### Running Frontend Tests

```bash
# Navigate to frontend directory
cd frontend

# Run tests (single run)
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests in headless mode (CI)
npm run test:ci
```

### Test Coverage

The frontend tests cover:

#### AuthService Tests (15 tests)
- ✅ Login flow (success, 2FA, errors)
- ✅ Registration
- ✅ Logout and token management
- ✅ 2FA enable/verify/disable
- ✅ HTTP error handling

#### DocumentService Tests (13 tests)
- ✅ Document upload
- ✅ Document listing (paginated, filtered)
- ✅ Document details retrieval
- ✅ Field updates
- ✅ CSV export and download

#### SignalRService Tests (9 tests)
- ✅ Connection management
- ✅ Processing progress events
- ✅ Processing complete events
- ✅ Dashboard update events
- ✅ Connection state changes

### Writing New Frontend Tests

Example test structure:

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { YourService } from './your.service';

describe('YourService', () => {
  let service: YourService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [YourService]
    });

    service = TestBed.inject(YourService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should perform action', (done) => {
    const mockData = { /* ... */ };

    service.methodUnderTest().subscribe(result => {
      expect(result).toEqual(mockData);
      done();
    });

    const req = httpMock.expectOne('api/endpoint');
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
  });
});
```

## Test Best Practices

### General Guidelines

1. **AAA Pattern**: Arrange, Act, Assert
2. **Test Naming**: `MethodName_Condition_ExpectedBehavior`
3. **One Assertion Per Test**: Focus on single behavior
4. **Mock External Dependencies**: Isolate unit under test
5. **Test Edge Cases**: Not just happy paths

### Backend-Specific

- Use `InMemoryDatabase` for testing EF Core code
- Mock external services (Azure, Stripe, etc.)
- Test both success and error paths
- Verify method calls with `Verify()`
- Use `IDisposable` for cleanup

### Frontend-Specific

- Always call `httpMock.verify()` in `afterEach`
- Use `done()` callback for async tests
- Test observables with subscriptions
- Mock localStorage when needed
- Test HTTP errors, not just success

## Continuous Integration

### GitHub Actions (Future)

Example workflow for automated testing:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup .NET
        uses: actions/setup-dotnet@v1
        with:
          dotnet-version: '9.0.x'
      - name: Run Backend Tests
        run: |
          cd backend
          dotnet test --logger "trx" /p:CollectCoverage=true

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '20.x'
      - name: Run Frontend Tests
        run: |
          cd frontend
          npm ci
          npm run test:ci
```

## Test Metrics

### Current Coverage

- **Backend**: 71 unit tests across 3 service classes + integration tests
- **Frontend**: 37 tests across 3 service classes

### Areas for Expansion

Future test coverage could include:

1. **Backend**
   - BlobStorageService tests
   - AzureDocumentIntelligenceService tests
   - EmailService tests
   - SignalR hub tests
   - Middleware tests
   - Additional API endpoint tests

2. **Frontend**
   - Component tests
   - Dashboard service tests
   - Subscription service tests
   - Guard tests
   - Interceptor tests
   - Integration tests with TestBed

## Troubleshooting

### Common Issues

#### Backend

**Issue**: Tests can't find dependencies
```bash
# Solution: Restore packages
dotnet restore
```

**Issue**: Database context errors
```bash
# Solution: Ensure using InMemoryDatabase provider
```

#### Frontend

**Issue**: Karma doesn't start
```bash
# Solution: Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Issue**: Tests timeout
```bash
# Solution: Ensure async tests use done() callback or async/await
```

## Resources

- [xUnit Documentation](https://xunit.net/)
- [Moq Documentation](https://github.com/moq/moq4)
- [Jasmine Documentation](https://jasmine.github.io/)
- [Angular Testing Guide](https://angular.io/guide/testing)
- [Testing Best Practices](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-best-practices)
