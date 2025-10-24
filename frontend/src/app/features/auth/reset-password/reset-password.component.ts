import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ...HlmButtonImports],
  template: `
    <div class="min-h-[60vh] flex items-center justify-center">
      <div class="w-full max-w-md">
        <div class="bg-card rounded-lg shadow-lg p-8 border">
          <h1 class="text-2xl font-bold mb-2">Reset Password</h1>
          <p class="text-muted-foreground mb-6">
            Enter your new password below.
          </p>

          @if (!token()) {
            <div class="bg-destructive/10 border border-destructive rounded-lg p-4 mb-6">
              <p class="text-sm text-destructive">
                Invalid or missing reset token. Please request a new password reset link.
              </p>
            </div>
            <a hlmBtn class="w-full" routerLink="/forgot-password">
              Request New Link
            </a>
          } @else if (resetSuccess()) {
            <div class="bg-green-500/10 border border-green-500 rounded-lg p-4 mb-6">
              <p class="text-sm">
                Your password has been reset successfully!
              </p>
            </div>
            <a hlmBtn class="w-full" routerLink="/login">
              Go to Login
            </a>
          } @else {
            <form (ngSubmit)="onSubmit()" #form="ngForm">
              <div class="mb-4">
                <label for="password" class="block text-sm font-medium mb-2">New Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  [(ngModel)]="password"
                  required
                  minlength="8"
                  class="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  [disabled]="isLoading()"
                  placeholder="Enter new password"
                />
                <p class="text-xs text-muted-foreground mt-1">
                  At least 8 characters with uppercase, lowercase, number, and special character
                </p>
              </div>

              <div class="mb-4">
                <label for="confirmPassword" class="block text-sm font-medium mb-2">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  [(ngModel)]="confirmPassword"
                  required
                  class="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  [disabled]="isLoading()"
                  placeholder="Confirm new password"
                />
              </div>

              @if (error()) {
                <div class="mb-4 p-3 bg-destructive/10 border border-destructive rounded-lg">
                  <p class="text-sm text-destructive">{{ error() }}</p>
                </div>
              }

              <button
                type="submit"
                hlmBtn
                class="w-full mb-4"
                [disabled]="isLoading() || !form.valid || password !== confirmPassword"
              >
                @if (isLoading()) {
                  <span>Resetting...</span>
                } @else {
                  <span>Reset Password</span>
                }
              </button>

              <div class="text-center">
                <a routerLink="/login" class="text-sm text-primary hover:underline">
                  Back to Login
                </a>
              </div>
            </form>
          }
        </div>
      </div>
    </div>
  `
})
export class ResetPasswordComponent implements OnInit {
  authService = inject(AuthService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  toastService = inject(ToastService);

  token = signal<string | null>(null);
  password = '';
  confirmPassword = '';
  isLoading = signal(false);
  error = signal<string | null>(null);
  resetSuccess = signal(false);

  ngOnInit() {
    // Get token from query params
    this.route.queryParams.subscribe(params => {
      this.token.set(params['token'] || null);
    });
  }

  async onSubmit() {
    if (!this.password || !this.confirmPassword || !this.token()) {
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error.set('Passwords do not match');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    try {
      await this.authService.resetPassword(this.token()!, this.password, this.confirmPassword);
      this.resetSuccess.set(true);
      this.toastService.success('Password reset successfully');
    } catch (err: any) {
      this.error.set(err.error?.error || 'Failed to reset password');
      this.toastService.error(this.error()!);
    } finally {
      this.isLoading.set(false);
    }
  }
}
