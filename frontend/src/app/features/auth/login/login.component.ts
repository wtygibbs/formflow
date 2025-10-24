import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HlmFormFieldImports } from "@spartan-ng/helm/form-field";
import { HlmInputImports } from '../../../../../libs/ui/ui-input-helm/src';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, HlmFormFieldImports, HlmInputImports],
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

          <form (ngSubmit)="onSubmit()" [formGroup]="form" class="space-y-4">
            @if (!twoFactorRequired()) {
              <hlm-form-field>
                <label hlmLabel for="email">Email</label>
                <input
                  hlmInput
                  type="email"
                  id="email"
                  name="email"
                  formControlName="email"
                  required
                  email
                  placeholder="you@example.com"
                />

                <hlm-hint>This is your email address.</hlm-hint>
			          <hlm-error>The email is required.</hlm-error>
              </hlm-form-field>

                            <hlm-form-field>
                              <label hlmLabel for="password">Password</label>
                <input
                  hlmInput
                  type="password"
                  id="password"
                  name="password"
                  formControlName="password"
                  required
                  placeholder="*********"
                />

                <hlm-hint>This is your email address.</hlm-hint>
			          <hlm-error>The email is required.</hlm-error>
              </hlm-form-field>
            } @else {
              <div class="form-control">
                <label class="label" for="twoFactorCode">
                  <span class="label-text">Two-Factor Authentication Code</span>
                </label>
                <input
                  type="text"
                  id="twoFactorCode"
                  name="twoFactorCode"
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
              [disabled]="!form.valid || loading()"
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
  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    email: this.fb.control<string>('', { nonNullable: true }),
    password: '',
    twoFactorCode: ''
  });

  twoFactorRequired = signal(false);
  error = signal('');
  success = signal('');
  loading = signal(false);

  onSubmit() {
    this.error.set('');
    this.success.set('');
    this.loading.set(true);

    const { ...value } = this.form.value;

    this.authService.login({
      email: value.email || '',
      password: value.password || '',
      twoFactorCode: value.twoFactorCode
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
