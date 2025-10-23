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
      <div class="card bg-base-100 shadow-2xl w-full max-w-md">
        <div class="card-body">
          <h2 class="card-title text-3xl font-bold justify-center text-primary mb-2">Create Account</h2>
          <p class="text-center text-base-content/60 mb-6">Start parsing ACORD forms with AI</p>

          @if (error()) {
            <div class="alert alert-error mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{{ error() }}</span>
            </div>
          }

          @if (success()) {
            <div class="alert alert-success mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{{ success() }}</span>
            </div>
          }

          <form (ngSubmit)="onSubmit()" #registerForm="ngForm" class="space-y-4">
            <div class="form-control">
              <label class="label" for="email">
                <span class="label-text font-semibold">Email</span>
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
                <span class="label-text font-semibold">Password</span>
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
                <span class="label-text font-semibold">Confirm Password</span>
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
              @if (loading()) {
                <span class="loading loading-spinner"></span>
                <span>Creating account...</span>
              } @else {
                <span>Sign Up</span>
              }
            </button>
          </form>

          <div class="divider">OR</div>

          <p class="text-center text-base-content/60">
            Already have an account?
            <a routerLink="/login" class="link link-primary font-semibold">Sign in</a>
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
