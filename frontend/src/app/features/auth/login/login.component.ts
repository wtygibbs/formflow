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
      <div class="w-full max-w-md">
        <div class="rounded-lg border border-border bg-card p-8 shadow-sm">
          <div class="mb-6 text-center">
            <h2 class="text-2xl font-semibold tracking-tight">Sign In</h2>
            <p class="mt-2 text-sm text-muted-foreground">Welcome back to ACORD Parser</p>
          </div>

          @if (error()) {
            <div class="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {{ error() }}
            </div>
          }

          @if (success()) {
            <div class="mb-4 rounded-md border border-green-500/50 bg-green-500/10 px-4 py-3 text-sm text-green-700">
              {{ success() }}
            </div>
          }

          <form (ngSubmit)="onSubmit()" #loginForm="ngForm" class="space-y-4">
            @if (!twoFactorRequired()) {
              <div class="space-y-2">
                <label for="email" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  [(ngModel)]="email"
                  required
                  email
                  class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="you@example.com"
                />
              </div>

              <div class="space-y-2">
                <label for="password" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  [(ngModel)]="password"
                  required
                  minlength="8"
                  class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Enter your password"
                />
              </div>
            } @else {
              <div class="space-y-2">
                <label for="twoFactorCode" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Two-Factor Authentication Code
                </label>
                <input
                  type="text"
                  id="twoFactorCode"
                  name="twoFactorCode"
                  [(ngModel)]="twoFactorCode"
                  required
                  pattern="[0-9]{6}"
                  class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-center text-2xl tracking-widest ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="000000"
                  maxlength="6"
                />
                <p class="text-xs text-muted-foreground">Enter the 6-digit code from your authenticator app</p>
              </div>
            }

            <button
              type="submit"
              class="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              [disabled]="!loginForm.valid || loading()"
            >
              {{ loading() ? 'Signing in...' : (twoFactorRequired() ? 'Verify Code' : 'Sign In') }}
            </button>
          </form>

          <div class="relative my-4">
            <div class="absolute inset-0 flex items-center">
              <span class="w-full border-t border-border"></span>
            </div>
            <div class="relative flex justify-center text-xs uppercase">
              <span class="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <p class="text-center text-sm text-muted-foreground">
            Don't have an account?
            <a routerLink="/register" class="font-medium text-primary hover:underline">Sign up</a>
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
