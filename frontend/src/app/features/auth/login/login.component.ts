import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HlmFormFieldImports } from "@spartan-ng/helm/form-field";
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ...HlmFormFieldImports,
    ...HlmInputImports,
    ...HlmCardImports,
    ...HlmButtonImports,
    ...HlmAlertImports,
    ...HlmSeparatorImports
  ],
  template: `
    <div class="flex justify-center items-center min-h-[calc(100vh-300px)]">
      <div hlmCard class="w-full max-w-md">
        <div hlmCardHeader>
          <h2 hlmCardTitle class="text-2xl text-center">Sign In</h2>
          <p hlmCardDescription class="text-center">Welcome back to ACORD Parser</p>
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
                  placeholder="you@example.com"
                />
                <hlm-error>Email is required</hlm-error>
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
                  placeholder="Enter your password"
                />
                <hlm-error>Password is required</hlm-error>
              </hlm-form-field>
            } @else {
              <hlm-form-field>
                <label hlmLabel for="twoFactorCode">Two-Factor Authentication Code</label>
                <input
                  hlmInput
                  type="text"
                  id="twoFactorCode"
                  name="twoFactorCode"
                  formControlName="twoFactorCode"
                  required
                  pattern="[0-9]{6}"
                  class="text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxlength="6"
                />
                <hlm-hint>Enter the 6-digit code from your authenticator app</hlm-hint>
                <hlm-error>Code is required</hlm-error>
              </hlm-form-field>
            }

            <button
              hlmBtn
              type="submit"
              class="w-full"
              [disabled]="!form.valid || loading()"
            >
              {{ loading() ? 'Signing in...' : (twoFactorRequired() ? 'Verify Code' : 'Sign In') }}
            </button>
          </form>

          <div class="relative my-4">
            <div hlmSeparator></div>
            <span class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">OR</span>
          </div>

          <p class="text-center text-sm text-muted-foreground">
            Don't have an account?
            <a routerLink="/register" class="font-medium text-primary underline-offset-4 hover:underline">Sign up</a>
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
