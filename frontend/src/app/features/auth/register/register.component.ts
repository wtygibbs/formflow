import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ...HlmCardImports,
    ...HlmButtonImports,
    ...HlmAlertImports,
    ...HlmSeparatorImports,
    ...HlmInputImports,
    ...HlmLabelImports
  ],
  template: `
    <div class="flex justify-center items-center min-h-[calc(100vh-300px)]">
      <div hlmCard class="w-full max-w-md">
        <div hlmCardHeader>
          <h2 hlmCardTitle class="text-2xl text-center">Create Account</h2>
          <p hlmCardDescription class="text-center">Start parsing ACORD forms with AI</p>
        </div>

        <div hlmCardContent>
          @if (error()) {
            <div hlmAlert variant="destructive" class="mb-4">
              <p hlmAlertDescription>{{ error() }}</p>
            </div>
          }

          @if (success()) {
            <div hlmAlert class="mb-4">
              <p hlmAlertDescription>{{ success() }}</p>
            </div>
          }

          <form (ngSubmit)="onSubmit()" #registerForm="ngForm" class="space-y-4">
            <div class="space-y-2">
              <label hlmLabel for="email">Email</label>
              <input
                hlmInput
                type="email"
                id="email"
                name="email"
                [(ngModel)]="email"
                required
                email
                class="w-full"
                placeholder="you@example.com"
              />
            </div>

            <div class="space-y-2">
              <label hlmLabel for="password">Password</label>
              <input
                hlmInput
                type="password"
                id="password"
                name="password"
                [(ngModel)]="password"
                required
                minlength="8"
                class="w-full"
                placeholder="Minimum 8 characters"
              />
              <p class="text-xs text-muted-foreground">
                Must be at least 8 characters with uppercase, lowercase, number, and special character
              </p>
            </div>

            <div class="space-y-2">
              <label hlmLabel for="confirmPassword">Confirm Password</label>
              <input
                hlmInput
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                [(ngModel)]="confirmPassword"
                required
                minlength="8"
                class="w-full"
                placeholder="Re-enter your password"
              />
            </div>

            <button
              hlmBtn
              type="submit"
              class="w-full"
              [disabled]="!registerForm.valid || loading()"
            >
              {{ loading() ? 'Creating account...' : 'Sign Up' }}
            </button>
          </form>

          <div class="relative my-4">
            <div hlmSeparator></div>
            <span class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">OR</span>
          </div>

          <p class="text-center text-sm text-muted-foreground">
            Already have an account?
            <a routerLink="/login" class="font-medium text-primary underline-offset-4 hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  confirmPassword = '';
  error = signal('');
  success = signal('');
  loading = signal(false);

  onSubmit() {
    this.error.set('');
    this.success.set('');

    if (this.password !== this.confirmPassword) {
      this.error.set('Passwords do not match');
      return;
    }

    this.loading.set(true);

    this.authService.register({
      email: this.email,
      password: this.password,
      confirmPassword: this.confirmPassword
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set('Registration successful! Redirecting to login...');
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error || 'Registration failed. Please try again.');
      }
    });
  }
}
