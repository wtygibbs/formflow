import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { AuthService } from '../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface UserProfile {
  email: string;
  createdAt: string;
  lastLoginAt: string | null;
  subscriptionTier: string;
  documentsProcessedThisMonth: number;
  twoFactorEnabled: boolean;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, ...HlmButtonImports],
  template: `
    <div class="max-w-4xl">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-3xl font-bold">Profile</h1>
        <a hlmBtn variant="outline" routerLink="/settings">
          <span class="mr-2">⚙️</span> Settings
        </a>
      </div>

      @if (isLoading()) {
        <div class="text-center py-12">
          <p class="text-muted-foreground">Loading profile...</p>
        </div>
      } @else if (profile()) {
        <div class="grid gap-6">
          <!-- Account Information Card -->
          <div class="bg-card border rounded-lg p-6">
            <h2 class="text-xl font-semibold mb-4">Account Information</h2>
            <div class="space-y-4">
              <div class="flex items-center justify-between py-3 border-b">
                <div>
                  <p class="text-sm text-muted-foreground">Email Address</p>
                  <p class="font-medium">{{ profile()!.email }}</p>
                </div>
                <div class="flex items-center gap-2 text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">
                  <span>✓</span> Verified
                </div>
              </div>

              <div class="flex items-center justify-between py-3 border-b">
                <div>
                  <p class="text-sm text-muted-foreground">Member Since</p>
                  <p class="font-medium">{{ formatDate(profile()!.createdAt) }}</p>
                </div>
              </div>

              <div class="flex items-center justify-between py-3">
                <div>
                  <p class="text-sm text-muted-foreground">Last Login</p>
                  <p class="font-medium">{{ profile()!.lastLoginAt ? formatDate(profile()!.lastLoginAt!) : 'Never' }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Subscription Card -->
          <div class="bg-card border rounded-lg p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-semibold">Subscription</h2>
              <a hlmBtn variant="outline" size="sm" routerLink="/subscription">
                Manage
              </a>
            </div>
            <div class="space-y-4">
              <div class="flex items-center justify-between py-3 border-b">
                <div>
                  <p class="text-sm text-muted-foreground">Current Plan</p>
                  <p class="font-medium text-lg">{{ profile()!.subscriptionTier }}</p>
                </div>
                <div class="text-2xl">
                  {{ getSubscriptionIcon(profile()!.subscriptionTier) }}
                </div>
              </div>

              <div class="flex items-center justify-between py-3">
                <div>
                  <p class="text-sm text-muted-foreground">Documents Processed This Month</p>
                  <p class="font-medium text-lg">{{ profile()!.documentsProcessedThisMonth }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Security Card -->
          <div class="bg-card border rounded-lg p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-semibold">Security</h2>
              <a hlmBtn variant="outline" size="sm" routerLink="/settings">
                Configure
              </a>
            </div>
            <div class="space-y-4">
              <div class="flex items-center justify-between py-3 border-b">
                <div>
                  <p class="text-sm text-muted-foreground">Two-Factor Authentication</p>
                  <p class="font-medium">{{ profile()!.twoFactorEnabled ? 'Enabled' : 'Disabled' }}</p>
                </div>
                @if (profile()!.twoFactorEnabled) {
                  <div class="flex items-center gap-2 text-xs bg-green-500/10 text-green-500 px-3 py-1 rounded-full">
                    <span>✓</span> Active
                  </div>
                } @else {
                  <div class="flex items-center gap-2 text-xs bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full">
                    <span>⚠</span> Recommended
                  </div>
                }
              </div>

              <div class="flex items-center justify-between py-3">
                <div>
                  <p class="text-sm text-muted-foreground">Password</p>
                  <p class="font-medium">••••••••</p>
                </div>
                <a hlmBtn variant="ghost" size="sm" routerLink="/settings">
                  Change
                </a>
              </div>
            </div>
          </div>
        </div>
      } @else if (error()) {
        <div class="bg-destructive/10 border border-destructive rounded-lg p-6 text-center">
          <p class="text-destructive">{{ error() }}</p>
          <button hlmBtn variant="outline" class="mt-4" (click)="loadProfile()">
            Retry
          </button>
        </div>
      }
    </div>
  `,
  styles: []
})
export class ProfileComponent implements OnInit {
  authService = inject(AuthService);
  http = inject(HttpClient);

  profile = signal<UserProfile | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);

  ngOnInit() {
    this.loadProfile();
  }

  async loadProfile() {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const data = await this.http.get<UserProfile>(`${environment.apiUrl}/user/profile`)
        .toPromise();
      this.profile.set(data!);
    } catch (err: any) {
      this.error.set(err.error?.error || 'Failed to load profile');
    } finally {
      this.isLoading.set(false);
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getSubscriptionIcon(tier: string): string {
    const icons: Record<string, string> = {
      'Free': '🆓',
      'Starter': '🚀',
      'Growth': '📈',
      'Pro': '⭐'
    };
    return icons[tier] || '📦';
  }
}
