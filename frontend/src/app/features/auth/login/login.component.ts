import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <h2>Sign In</h2>
        <p class="subtitle">Welcome back to ACORD Parser</p>

        @if (error()) {
          <div class="alert alert-error">{{ error() }}</div>
        }

        @if (success()) {
          <div class="alert alert-success">{{ success() }}</div>
        }

        <form (ngSubmit)="onSubmit()" #loginForm="ngForm">
          @if (!twoFactorRequired()) {
            <div class="form-group">
              <label for="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                [(ngModel)]="email"
                required
                email
                class="form-control"
                placeholder="you@example.com"
              />
            </div>

            <div class="form-group">
              <label for="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                [(ngModel)]="password"
                required
                minlength="8"
                class="form-control"
                placeholder="Enter your password"
              />
            </div>
          } @else {
            <div class="form-group">
              <label for="twoFactorCode">Two-Factor Authentication Code</label>
              <input
                type="text"
                id="twoFactorCode"
                name="twoFactorCode"
                [(ngModel)]="twoFactorCode"
                required
                pattern="[0-9]{6}"
                class="form-control"
                placeholder="000000"
                maxlength="6"
              />
              <small>Enter the 6-digit code from your authenticator app</small>
            </div>
          }

          <button
            type="submit"
            class="btn btn-primary btn-block"
            [disabled]="!loginForm.valid || loading()"
          >
            @if (loading()) {
              <span>Signing in...</span>
            } @else {
              <span>{{ twoFactorRequired() ? 'Verify Code' : 'Sign In' }}</span>
            }
          </button>
        </form>

        <p class="auth-link">
          Don't have an account? <a routerLink="/register">Sign up</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: calc(100vh - 300px);
    }

    .auth-card {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      width: 100%;
      max-width: 400px;
    }

    h2 {
      margin: 0 0 0.5rem 0;
      text-align: center;
      color: #667eea;
    }

    .subtitle {
      text-align: center;
      color: #6c757d;
      margin: 0 0 2rem 0;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #333;
    }

    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
      box-sizing: border-box;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    small {
      display: block;
      margin-top: 0.5rem;
      color: #6c757d;
      font-size: 0.875rem;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-block {
      width: 100%;
    }

    .alert {
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 1.5rem;
    }

    .alert-error {
      background: #fee;
      color: #c33;
      border: 1px solid #fcc;
    }

    .alert-success {
      background: #efe;
      color: #3c3;
      border: 1px solid #cfc;
    }

    .auth-link {
      text-align: center;
      margin-top: 1.5rem;
      color: #6c757d;
    }

    .auth-link a {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
    }

    .auth-link a:hover {
      text-decoration: underline;
    }
  `]
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  twoFactorCode = '';
  twoFactorRequired = signal(false);
  error = signal('');
  success = signal('');
  loading = signal(false);

  onSubmit() {
    this.error.set('');
    this.success.set('');
    this.loading.set(true);

    this.authService.login({
      email: this.email,
      password: this.password,
      twoFactorCode: this.twoFactorCode || undefined
    }).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.twoFactorRequired) {
          this.twoFactorRequired.set(true);
          this.success.set('Please enter your two-factor authentication code');
        } else {
          this.success.set('Login successful!');
          setTimeout(() => this.router.navigate(['/dashboard']), 500);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error || 'Login failed. Please try again.');
      }
    });
  }
}
