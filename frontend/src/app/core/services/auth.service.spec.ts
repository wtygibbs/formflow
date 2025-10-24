import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService, LoginRequest, RegisterRequest, LoginResponse } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('login', () => {
    it('should login successfully and store token', (done) => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      const mockResponse: LoginResponse = {
        token: 'fake-jwt-token',
        email: 'test@example.com',
        subscriptionTier: 0,
        twoFactorRequired: false
      };

      service.login(loginRequest).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(service.isAuthenticated()).toBe(true);
        expect(service.currentUser()).toEqual({
          email: 'test@example.com',
          subscriptionTier: 0
        });
        expect(service.getToken()).toBe('fake-jwt-token');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(loginRequest);
      req.flush(mockResponse);
    });

    it('should handle 2FA required response', (done) => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      const mockResponse: LoginResponse = {
        token: '',
        email: 'test@example.com',
        subscriptionTier: 0,
        twoFactorRequired: true
      };

      service.login(loginRequest).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(service.isAuthenticated()).toBe(false);
        expect(service.currentUser()).toBeNull();
        expect(service.getToken()).toBeNull();
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush(mockResponse);
    });

    it('should handle login error', (done) => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'WrongPassword'
      };

      service.login(loginRequest).subscribe(
        () => fail('should have failed'),
        error => {
          expect(error.status).toBe(401);
          expect(service.isAuthenticated()).toBe(false);
          done();
        }
      );

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush({ error: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });
    });

    it('should login with 2FA code', (done) => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'Password123!',
        twoFactorCode: '123456'
      };

      const mockResponse: LoginResponse = {
        token: 'fake-jwt-token-2fa',
        email: 'test@example.com',
        subscriptionTier: 1,
        twoFactorRequired: false
      };

      service.login(loginRequest).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(service.getToken()).toBe('fake-jwt-token-2fa');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.body.twoFactorCode).toBe('123456');
      req.flush(mockResponse);
    });
  });

  describe('register', () => {
    it('should register successfully', (done) => {
      const registerRequest: RegisterRequest = {
        email: 'newuser@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      };

      const mockResponse = { message: 'Registration successful' };

      service.register(registerRequest).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(registerRequest);
      req.flush(mockResponse);
    });

    it('should handle registration error', (done) => {
      const registerRequest: RegisterRequest = {
        email: 'existing@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      };

      service.register(registerRequest).subscribe(
        () => fail('should have failed'),
        error => {
          expect(error.status).toBe(400);
          done();
        }
      );

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
      req.flush({ error: 'Email already exists' }, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('logout', () => {
    it('should clear token and reset state', () => {
      // Setup authenticated state
      localStorage.setItem('auth_token', 'fake-token');
      service.isAuthenticated.set(true);
      service.currentUser.set({
        email: 'test@example.com',
        subscriptionTier: 0
      });

      // Logout
      service.logout();

      expect(service.getToken()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(service.currentUser()).toBeNull();
    });
  });

  describe('token management', () => {
    it('should get token from localStorage', () => {
      localStorage.setItem('auth_token', 'test-token');
      expect(service.getToken()).toBe('test-token');
    });

    it('should return null when no token exists', () => {
      expect(service.getToken()).toBeNull();
    });

    it('should detect authenticated state on initialization', () => {
      localStorage.setItem('auth_token', 'existing-token');

      // Create new service instance to test initialization
      const newService = new AuthService();
      expect(newService.isAuthenticated()).toBe(true);
    });

    it('should detect unauthenticated state on initialization', () => {
      localStorage.clear();

      // Create new service instance to test initialization
      const newService = new AuthService();
      expect(newService.isAuthenticated()).toBe(false);
    });
  });

  describe('2FA operations', () => {
    it('should enable 2FA', (done) => {
      const mockResponse = {
        secret: 'TEST2FASECRET123',
        qrCodeUrl: 'https://chart.googleapis.com/chart?...'
      };

      service.enable2FA('Password123!').subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.secret).toBe('TEST2FASECRET123');
        expect(response.qrCodeUrl).toContain('chart.googleapis.com');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/2fa/enable`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ password: 'Password123!' });
      req.flush(mockResponse);
    });

    it('should verify 2FA code', (done) => {
      const mockResponse = { message: '2FA enabled successfully' };

      service.verify2FA('123456').subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/2fa/verify`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ code: '123456' });
      req.flush(mockResponse);
    });

    it('should handle invalid 2FA code', (done) => {
      service.verify2FA('000000').subscribe(
        () => fail('should have failed'),
        error => {
          expect(error.status).toBe(400);
          done();
        }
      );

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/2fa/verify`);
      req.flush({ error: 'Invalid code' }, { status: 400, statusText: 'Bad Request' });
    });

    it('should disable 2FA', (done) => {
      const mockResponse = { message: '2FA disabled successfully' };

      service.disable2FA('Password123!').subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/2fa/disable`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ password: 'Password123!' });
      req.flush(mockResponse);
    });
  });
});
