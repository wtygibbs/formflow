import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="flex justify-center items-center min-h-[calc(100vh-300px)]">
      <div class="card bg-base-100 border border-base-300 shadow-sm w-full max-w-md">
        <div class="card-body">
          <div class="text-center mb-6">
            <h2 class="text-2xl font-semibold">Create Account</h2>
            <p class="text-sm text-base-content/70 mt-2">Start parsing ACORD forms with AI</p>
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

          <form (ngSubmit)="onSubmit()" #registerForm="ngForm" class="space-y-4">
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
                placeholder="Minimum 8 characters"
              />
              <label class="label">
                <span class="label-text-alt">Must be at least 8 characters with uppercase, lowercase, number, and special character</span>
              </label>
            </div>

            <div class="form-control">
              <label class="label" for="confirmPassword">
                <span class="label-text">Confirm Password</span>
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                [(ngModel)]="confirmPassword"
                required
                minlength="8"
                class="input input-bordered w-full"
                placeholder="Re-enter your password"
              />
            </div>

            <button
              type="submit"
              class="btn btn-primary w-full"
              [disabled]="!registerForm.valid || loading()"
            >
              {{ loading() ? 'Creating account...' : 'Sign Up' }}
            </button>
          </form>

          <div class="divider text-xs">OR</div>

          <p class="text-center text-sm text-base-content/70">
            Already have an account?
            <a routerLink="/login" class="link link-primary">Sign in</a>
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
