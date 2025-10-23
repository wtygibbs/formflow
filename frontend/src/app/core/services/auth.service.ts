import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LoginRequest {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginResponse {
  token: string;
  email: string;
  subscriptionTier: number;
  twoFactorRequired: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly TOKEN_KEY = 'auth_token';

  isAuthenticated = signal<boolean>(this.hasToken());
  currentUser = signal<{ email: string; subscriptionTier: number } | null>(null);

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, request)
      .pipe(
        tap(response => {
          if (response.token && !response.twoFactorRequired) {
            this.setToken(response.token);
            this.currentUser.set({
              email: response.email,
              subscriptionTier: response.subscriptionTier
            });
            this.isAuthenticated.set(true);
          }
        })
      );
  }

  register(request: RegisterRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/register`, request);
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  private hasToken(): boolean {
    return !!this.getToken();
  }

  enable2FA(password: string): Observable<{ secret: string; qrCodeUrl: string }> {
    return this.http.post<{ secret: string; qrCodeUrl: string }>(
      `${environment.apiUrl}/auth/2fa/enable`,
      { password }
    );
  }

  verify2FA(code: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${environment.apiUrl}/auth/2fa/verify`,
      { code }
    );
  }

  disable2FA(password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${environment.apiUrl}/auth/2fa/disable`,
      { password }
    );
  }
}
