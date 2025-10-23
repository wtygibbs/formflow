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
    <div class="flex justify-center items-center min-h-[calc(100vh-300px)]">
      <div class="card bg-base-100 border border-base-300 shadow-sm w-full max-w-md">
        <div class="card-body">
          <div class="text-center mb-6">
            <h2 class="text-2xl font-semibold">Sign In</h2>
            <p class="text-sm text-base-content/70 mt-2">Welcome back to ACORD Parser</p>
          </div>

          @if (error()) {
            <div class="alert alert-error mb-4">
              <span>{{ error() }}</span>
            </div>
          }

          @if (success()) {
            <div class="alert alert-success mb-4">
              <span>{{ success() }}</span>
            </div>
          }

          <form (ngSubmit)="onSubmit()" #loginForm="ngForm" class="space-y-4">
            @if (!twoFactorRequired()) {
              <div class="form-control">
                <label class="label" for="email">
                  <span class="label-text">Email</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  [(ngModel)]="email"
                  required
                  email
                  class="input input-bordered w-full"
                  placeholder="you@example.com"
                />
              </div>

              <div class="form-control">
                <label class="label" for="password">
                  <span class="label-text">Password</span>
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  [(ngModel)]="password"
                  required
                  minlength="8"
                  class="input input-bordered w-full"
                  placeholder="Enter your password"
                />
              </div>
            } @else {
              <div class="form-control">
                <label class="label" for="twoFactorCode">
                  <span class="label-text">Two-Factor Authentication Code</span>
                </label>
                <input
                  type="text"
                  id="twoFactorCode"
                  name="twoFactorCode"
                  [(ngModel)]="twoFactorCode"
                  required
                  pattern="[0-9]{6}"
                  class="input input-bordered w-full text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxlength="6"
                />
                <label class="label">
                  <span class="label-text-alt">Enter the 6-digit code from your authenticator app</span>
                </label>
              </div>
            }

            <button
              type="submit"
              class="btn btn-primary w-full"
              [disabled]="!loginForm.valid || loading()"
            >
              {{ loading() ? 'Signing in...' : (twoFactorRequired() ? 'Verify Code' : 'Sign In') }}
            </button>
          </form>

          <div class="divider text-xs">OR</div>

          <p class="text-center text-sm text-base-content/70">
            Don't have an account?
            <a routerLink="/register" class="link link-primary">Sign up</a>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: []
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
