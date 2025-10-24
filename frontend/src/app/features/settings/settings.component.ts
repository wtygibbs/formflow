import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { ToastService } from '../../core/services/toast.service';

type SettingsTab = 'account' | 'security' | 'preferences';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ...HlmButtonImports],
  template: `
    <div class="max-w-5xl">
      <h1 class="text-3xl font-bold mb-6">Settings</h1>

      <!-- Tabs -->
      <div class="flex gap-4 mb-6 border-b">
        <button
          (click)="activeTab.set('account')"
          class="px-4 py-2 font-medium transition-colors"
          [class.text-primary]="activeTab() === 'account'"
          [class.border-b-2]="activeTab() === 'account'"
          [class.border-primary]="activeTab() === 'account'"
          [class.text-muted-foreground]="activeTab() !== 'account'"
        >
          Account
        </button>
        <button
          (click)="activeTab.set('security')"
          class="px-4 py-2 font-medium transition-colors"
          [class.text-primary]="activeTab() === 'security'"
          [class.border-b-2]="activeTab() === 'security'"
          [class.border-primary]="activeTab() === 'security'"
          [class.text-muted-foreground]="activeTab() !== 'security'"
        >
          Security
        </button>
        <button
          (click)="activeTab.set('preferences')"
          class="px-4 py-2 font-medium transition-colors"
          [class.text-primary]="activeTab() === 'preferences'"
          [class.border-b-2]="activeTab() === 'preferences'"
          [class.border-primary]="activeTab() === 'preferences'"
          [class.text-muted-foreground]="activeTab() !== 'preferences'"
        >
          Preferences
        </button>
      </div>

      <!-- Account Tab -->
      @if (activeTab() === 'account') {
        <div class="space-y-6">
          <div class="bg-card border rounded-lg p-6">
            <h2 class="text-xl font-semibold mb-4">Account Information</h2>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-2">Email Address</label>
                <p class="text-muted-foreground text-sm">{{ authService.currentUser()?.email }}</p>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Security Tab -->
      @if (activeTab() === 'security') {
        <div class="space-y-6">
          <!-- Change Password -->
          <div class="bg-card border rounded-lg p-6">
            <h2 class="text-xl font-semibold mb-4">Change Password</h2>
            <form (ngSubmit)="changePassword()" class="space-y-4">
              <div>
                <label for="currentPassword" class="block text-sm font-medium mb-2">Current Password</label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  [(ngModel)]="currentPassword"
                  class="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  [disabled]="isChangingPassword()"
                />
              </div>

              <div>
                <label for="newPassword" class="block text-sm font-medium mb-2">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  [(ngModel)]="newPassword"
                  class="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  [disabled]="isChangingPassword()"
                />
                <p class="text-xs text-muted-foreground mt-1">
                  At least 8 characters with uppercase, lowercase, number, and special character
                </p>
              </div>

              <div>
                <label for="confirmNewPassword" class="block text-sm font-medium mb-2">Confirm New Password</label>
                <input
                  type="password"
                  id="confirmNewPassword"
                  name="confirmNewPassword"
                  [(ngModel)]="confirmNewPassword"
                  class="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  [disabled]="isChangingPassword()"
                />
              </div>

              @if (passwordError()) {
                <div class="p-3 bg-destructive/10 border border-destructive rounded-lg">
                  <p class="text-sm text-destructive">{{ passwordError() }}</p>
                </div>
              }

              <button
                type="submit"
                hlmBtn
                [disabled]="isChangingPassword() || !currentPassword || !newPassword || !confirmNewPassword"
              >
                {{ isChangingPassword() ? 'Changing...' : 'Change Password' }}
              </button>
            </form>
          </div>

          <!-- Two-Factor Authentication -->
          <div class="bg-card border rounded-lg p-6">
            <h2 class="text-xl font-semibold mb-4">Two-Factor Authentication</h2>

            @if (!twoFactorSecret()) {
              <div class="space-y-4">
                <p class="text-muted-foreground">
                  Add an extra layer of security to your account by enabling two-factor authentication.
                </p>

                @if (twoFactorError()) {
                  <div class="p-3 bg-destructive/10 border border-destructive rounded-lg">
                    <p class="text-sm text-destructive">{{ twoFactorError() }}</p>
                  </div>
                }

                <div>
                  <label for="2faPassword" class="block text-sm font-medium mb-2">Enter your password to enable 2FA</label>
                  <input
                    type="password"
                    id="2faPassword"
                    name="2faPassword"
                    [(ngModel)]="twoFactorPassword"
                    class="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary mb-4"
                    [disabled]="isEnabling2FA()"
                    placeholder="Your password"
                  />
                </div>

                <button
                  hlmBtn
                  (click)="enable2FA()"
                  [disabled]="isEnabling2FA() || !twoFactorPassword"
                >
                  {{ isEnabling2FA() ? 'Enabling...' : 'Enable 2FA' }}
                </button>
              </div>
            } @else {
              <div class="space-y-4">
                <p class="text-sm text-muted-foreground mb-4">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>

                <div class="bg-white p-4 rounded-lg inline-block">
                  <img [src]="qrCodeUrl()" alt="2FA QR Code" class="w-48 h-48" />
                </div>

                <div>
                  <p class="text-sm font-medium mb-2">Or enter this code manually:</p>
                  <code class="bg-muted px-3 py-2 rounded text-sm">{{ twoFactorSecret() }}</code>
                </div>

                <div class="mt-6">
                  <label for="2faCode" class="block text-sm font-medium mb-2">Enter the 6-digit code from your app</label>
                  <input
                    type="text"
                    id="2faCode"
                    name="2faCode"
                    [(ngModel)]="twoFactorCode"
                    maxlength="6"
                    class="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary text-center text-2xl tracking-widest"
                    [disabled]="isVerifying2FA()"
                    placeholder="000000"
                  />
                </div>

                @if (twoFactorError()) {
                  <div class="p-3 bg-destructive/10 border border-destructive rounded-lg">
                    <p class="text-sm text-destructive">{{ twoFactorError() }}</p>
                  </div>
                }

                <div class="flex gap-2">
                  <button
                    hlmBtn
                    (click)="verify2FA()"
                    [disabled]="isVerifying2FA() || twoFactorCode.length !== 6"
                  >
                    {{ isVerifying2FA() ? 'Verifying...' : 'Verify & Enable' }}
                  </button>
                  <button
                    hlmBtn
                    variant="outline"
                    (click)="cancel2FASetup()"
                    [disabled]="isVerifying2FA()"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Preferences Tab -->
      @if (activeTab() === 'preferences') {
        <div class="space-y-6">
          <div class="bg-card border rounded-lg p-6">
            <h2 class="text-xl font-semibold mb-4">Appearance</h2>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-2">Theme</label>
                <div class="flex gap-2">
                  <button
                    hlmBtn
                    [variant]="!themeService.isDark() ? 'default' : 'outline'"
                    (click)="themeService.setTheme('light')"
                  >
                    ☀️ Light
                  </button>
                  <button
                    hlmBtn
                    [variant]="themeService.isDark() ? 'default' : 'outline'"
                    (click)="themeService.setTheme('dark')"
                  >
                    🌙 Dark
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: []
})
export class SettingsComponent {
  authService = inject(AuthService);
  themeService = inject(ThemeService);
  toastService = inject(ToastService);

  activeTab = signal<SettingsTab>('account');

  // Password change
  currentPassword = '';
  newPassword = '';
  confirmNewPassword = '';
  isChangingPassword = signal(false);
  passwordError = signal<string | null>(null);

  // 2FA
  twoFactorPassword = '';
  twoFactorSecret = signal<string | null>(null);
  qrCodeUrl = signal<string | null>(null);
  twoFactorCode = '';
  isEnabling2FA = signal(false);
  isVerifying2FA = signal(false);
  twoFactorError = signal<string | null>(null);

  async changePassword() {
    if (this.newPassword !== this.confirmNewPassword) {
      this.passwordError.set('Passwords do not match');
      return;
    }

    this.isChangingPassword.set(true);
    this.passwordError.set(null);

    try {
      await this.authService.changePassword(this.currentPassword, this.newPassword, this.confirmNewPassword);
      this.toastService.success('Password changed successfully');
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmNewPassword = '';
    } catch (err: any) {
      this.passwordError.set(err.error?.error || 'Failed to change password');
      this.toastService.error(this.passwordError()!);
    } finally {
      this.isChangingPassword.set(false);
    }
  }

  async enable2FA() {
    this.isEnabling2FA.set(true);
    this.twoFactorError.set(null);

    try {
      const response = await this.authService.enable2FA(this.twoFactorPassword).toPromise();
      this.twoFactorSecret.set(response!.secret);
      this.qrCodeUrl.set(response!.qrCodeUrl);
      this.twoFactorPassword = '';
      this.toastService.success('Scan the QR code with your authenticator app');
    } catch (err: any) {
      this.twoFactorError.set(err.error?.error || 'Failed to enable 2FA');
      this.toastService.error(this.twoFactorError()!);
    } finally {
      this.isEnabling2FA.set(false);
    }
  }

  async verify2FA() {
    this.isVerifying2FA.set(true);
    this.twoFactorError.set(null);

    try {
      await this.authService.verify2FA(this.twoFactorCode).toPromise();
      this.toastService.success('Two-factor authentication enabled successfully!');
      this.cancel2FASetup();
    } catch (err: any) {
      this.twoFactorError.set(err.error?.error || 'Invalid code');
      this.toastService.error(this.twoFactorError()!);
    } finally {
      this.isVerifying2FA.set(false);
    }
  }

  cancel2FASetup() {
    this.twoFactorSecret.set(null);
    this.qrCodeUrl.set(null);
    this.twoFactorCode = '';
    this.twoFactorPassword = '';
    this.twoFactorError.set(null);
  }
}
