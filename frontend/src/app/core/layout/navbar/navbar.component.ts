import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { SignalRService } from '../../services/signalr.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, ...HlmButtonImports],
  template: `
    <header class="bg-card border-b h-16 flex items-center px-4 sticky top-0 z-40 relative">
      <div class="flex items-center justify-between w-full">
        <!-- Logo/Brand -->
        <h1 class="text-xl font-semibold cursor-pointer hover:opacity-80 transition-opacity" routerLink="/">
          ACORD Parser
        </h1>

        <!-- Right side actions -->
        <div class="flex items-center gap-2">
          <!-- Theme Toggle -->
          <button
            hlmBtn
            variant="ghost"
            size="sm"
            (click)="toggleTheme()"
            [attr.aria-label]="themeService.isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
            class="relative"
          >
            @if (themeService.isDark()) {
              <span class="text-lg">☀️</span>
            } @else {
              <span class="text-lg">🌙</span>
            }
          </button>

          @if (authService.isAuthenticated()) {
            <!-- Notifications -->
            <button
              hlmBtn
              variant="ghost"
              size="sm"
              (click)="toggleNotifications()"
              class="relative"
              [attr.aria-label]="'Notifications'"
            >
              <span class="text-lg">🔔</span>
              @if (notificationService.unreadCount() > 0) {
                <span class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                  {{ notificationService.unreadCount() > 9 ? '9+' : notificationService.unreadCount() }}
                </span>
              }
            </button>

            <!-- Logout Button -->
            <button hlmBtn variant="outline" size="sm" (click)="logout()">
              Logout
            </button>
          } @else {
            <!-- Login/Register buttons -->
            <a hlmBtn variant="ghost" size="sm" routerLink="/login">Login</a>
            <a hlmBtn size="sm" routerLink="/register">Sign Up</a>
          }
        </div>
      </div>

      <!-- Notification Dropdown Panel -->
      @if (showNotifications() && authService.isAuthenticated()) {
        <div class="absolute top-16 right-4 w-96 max-h-[600px] bg-card border rounded-lg shadow-xl overflow-hidden z-50">
          <!-- Header -->
          <div class="p-4 border-b flex items-center justify-between bg-muted/30">
            <h3 class="font-semibold text-lg">Notifications</h3>
            <div class="flex items-center gap-2">
              @if (notificationService.unreadCount() > 0) {
                <button
                  (click)="notificationService.markAllAsRead()"
                  class="text-xs text-primary hover:underline"
                >
                  Mark all as read
                </button>
              }
              <button
                (click)="toggleNotifications()"
                class="p-1 hover:bg-accent rounded"
                aria-label="Close notifications"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- Notification List -->
          <div class="overflow-y-auto max-h-[500px]">
            @if (notificationService.notifications().length === 0) {
              <div class="p-8 text-center text-muted-foreground">
                <span class="text-4xl block mb-2">📭</span>
                <p class="text-sm">No notifications yet</p>
              </div>
            } @else {
              @for (notification of notificationService.notifications(); track notification.id) {
                <div
                  class="p-4 border-b hover:bg-accent/50 transition-colors cursor-pointer"
                  [class.bg-muted/20]="!notification.isRead"
                  (click)="handleNotificationClick(notification)"
                >
                  <div class="flex items-start gap-3">
                    <!-- Icon -->
                    <div class="flex-shrink-0">
                      <span class="text-2xl">{{ notificationService.getTypeIcon(notification.type) }}</span>
                    </div>

                    <!-- Content -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-start justify-between gap-2">
                        <h4 class="font-semibold text-sm truncate">{{ notification.title }}</h4>
                        @if (!notification.isRead) {
                          <span class="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-1"></span>
                        }
                      </div>
                      <p class="text-xs text-muted-foreground mt-1 line-clamp-2">{{ notification.message }}</p>
                      <p class="text-xs text-muted-foreground mt-2">{{ formatDate(notification.createdAt) }}</p>
                    </div>

                    <!-- Delete Button -->
                    <button
                      (click)="deleteNotification($event, notification.id)"
                      class="flex-shrink-0 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
                      aria-label="Delete notification"
                    >
                      <span class="text-sm">🗑️</span>
                    </button>
                  </div>
                </div>
              }
            }
          </div>

          <!-- Footer -->
          @if (notificationService.notifications().length > 0) {
            <div class="p-3 border-t bg-muted/30 flex justify-center">
              <button
                (click)="clearAllNotifications()"
                class="text-xs text-destructive hover:underline"
              >
                Clear all notifications
              </button>
            </div>
          }
        </div>
      }

      <!-- Overlay to close dropdown when clicking outside -->
      @if (showNotifications()) {
        <div
          class="fixed inset-0 z-40"
          (click)="toggleNotifications()"
        ></div>
      }
    </header>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class NavbarComponent {
  authService = inject(AuthService);
  themeService = inject(ThemeService);
  signalRService = inject(SignalRService);
  notificationService = inject(NotificationService);
  router = inject(Router);

  showNotifications = signal<boolean>(false);

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleNotifications(): void {
    this.showNotifications.update(show => !show);
  }

  logout(): void {
    this.signalRService.stopConnection();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  async handleNotificationClick(notification: any): Promise<void> {
    // Mark as read if not already read
    if (!notification.isRead) {
      await this.notificationService.markAsRead(notification.id);
    }

    // Navigate to action URL if provided
    if (notification.actionUrl) {
      this.router.navigate([notification.actionUrl]);
      this.toggleNotifications(); // Close dropdown
    }
  }

  async deleteNotification(event: Event, notificationId: string): Promise<void> {
    event.stopPropagation(); // Prevent triggering the notification click
    await this.notificationService.deleteNotification(notificationId);
  }

  async clearAllNotifications(): Promise<void> {
    await this.notificationService.clearAll();
    this.toggleNotifications(); // Close dropdown
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
}
