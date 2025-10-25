import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ...HlmButtonImports],
  template: `
    <div class="min-h-[60vh] flex items-center justify-center">
      <div class="w-full max-w-md">
        <div class="bg-card rounded-lg shadow-lg p-8 border">
          <h1 class="text-2xl font-bold mb-2">Forgot Password</h1>
          <p class="text-muted-foreground mb-6">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          @if (emailSent()) {
            <div class="bg-green-500/10 border border-green-500 rounded-lg p-4 mb-6">
              <p class="text-sm">
                If your email is registered, you will receive a password reset link shortly.
                Please check your inbox and spam folder.
              </p>
            </div>
            <a hlmBtn class="w-full" routerLink="/login">
              Back to Login
            </a>
          } @else {
            <form (ngSubmit)="onSubmit()" #form="ngForm">
              <div class="mb-4">
                <label for="email" class="block text-sm font-medium mb-2">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  [(ngModel)]="email"
                  required
                  email
                  class="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  [disabled]="isLoading()"
                  placeholder="you@example.com"
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
                [disabled]="isLoading() || !form.valid"
              >
                @if (isLoading()) {
                  <span>Sending...</span>
                } @else {
                  <span>Send Reset Link</span>
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
export class ForgotPasswordComponent {
  authService = inject(AuthService);
  router = inject(Router);
  toastService = inject(ToastService);

  email = '';
  isLoading = signal(false);
  error = signal<string | null>(null);
  emailSent = signal(false);

  async onSubmit() {
    if (!this.email) {
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    try {
      await this.authService.forgotPassword(this.email);
      this.emailSent.set(true);
      this.toastService.success('Password reset email sent');
    } catch (err: any) {
      this.error.set(err.error?.error || 'Failed to send reset email');
      this.toastService.error(this.error()!);
    } finally {
      this.isLoading.set(false);
    }
  }
}
