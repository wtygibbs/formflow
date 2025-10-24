import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LayoutService } from '../../services/layout.service';
import { AuthService } from '../../services/auth.service';

export interface NavItem {
  label: string;
  icon: string;
  route: string;
  badge?: string;
}

@Component({
  selector: 'app-sidenav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside
      class="h-screen bg-card border-r transition-all duration-300 ease-in-out flex flex-col overflow-hidden"
      [class.w-64]="layoutService.isExpanded()"
      [class.w-20]="layoutService.isCollapsed()"
    >
      <!-- Sidenav Header -->
      <div class="h-16 flex items-center border-b flex-shrink-0"
           [class.justify-between]="layoutService.isExpanded()"
           [class.justify-center]="layoutService.isCollapsed()"
           [class.px-4]="layoutService.isExpanded()"
           [class.px-2]="layoutService.isCollapsed()">
        @if (layoutService.isExpanded()) {
          <h2 class="font-semibold text-sm">Navigation</h2>
        }
        <button
          (click)="layoutService.toggleSidenav()"
          class="p-2 rounded-lg hover:bg-accent transition-colors flex-shrink-0"
          [attr.aria-label]="layoutService.isExpanded() ? 'Collapse sidebar' : 'Expand sidebar'"
        >
          @if (layoutService.isExpanded()) {
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          } @else {
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          }
        </button>
      </div>

      <!-- Navigation Items -->
      <nav class="flex-1 overflow-y-auto py-4">
        <ul class="space-y-1"
            [class.px-3]="layoutService.isExpanded()"
            [class.px-2]="layoutService.isCollapsed()">
          @for (item of navItems; track item.route) {
            <li>
              <a
                [routerLink]="item.route"
                routerLinkActive="bg-primary text-primary-foreground"
                [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
                class="flex items-center rounded-lg hover:bg-accent transition-colors group relative"
                [class.gap-3]="layoutService.isExpanded()"
                [class.px-3]="layoutService.isExpanded()"
                [class.py-2.5]="layoutService.isExpanded()"
                [class.justify-center]="layoutService.isCollapsed()"
                [class.p-3]="layoutService.isCollapsed()"
                [attr.aria-label]="item.label"
              >
                <!-- Icon -->
                <span class="text-xl flex-shrink-0" [innerHTML]="item.icon"></span>

                <!-- Label (only show when expanded) -->
                @if (layoutService.isExpanded()) {
                  <span class="text-sm font-medium truncate">{{ item.label }}</span>

                  <!-- Badge (if present) -->
                  @if (item.badge) {
                    <span class="ml-auto text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                      {{ item.badge }}
                    </span>
                  }
                }

                <!-- Tooltip for collapsed mode -->
                @if (layoutService.isCollapsed()) {
                  <div class="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg border">
                    {{ item.label }}
                  </div>
                }
              </a>
            </li>
          }
        </ul>
      </nav>

      <!-- User Section -->
      <div class="border-t flex-shrink-0"
           [class.p-3]="layoutService.isExpanded()"
           [class.p-2]="layoutService.isCollapsed()">
        <div
          class="flex items-center rounded-lg hover:bg-accent transition-colors cursor-pointer"
          [class.gap-3]="layoutService.isExpanded()"
          [class.px-3]="layoutService.isExpanded()"
          [class.py-2.5]="layoutService.isExpanded()"
          [class.justify-center]="layoutService.isCollapsed()"
          [class.p-3]="layoutService.isCollapsed()"
        >
          <!-- User Avatar -->
          <div class="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-sm font-semibold">
            {{ getUserInitials() }}
          </div>

          <!-- User Info (only show when expanded) -->
          @if (layoutService.isExpanded()) {
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ authService.currentUser()?.email }}</p>
              <p class="text-xs text-muted-foreground truncate">{{ authService.currentUser()?.subscriptionTier }}</p>
            </div>
          }
        </div>
      </div>
    </aside>
  `,
  styles: []
})
export class SidenavComponent {
  layoutService = inject(LayoutService);
  authService = inject(AuthService);

  navItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: '📊',
      route: '/dashboard'
    },
    {
      label: 'Documents',
      icon: '📄',
      route: '/documents'
    },
    {
      label: 'Subscription',
      icon: '💳',
      route: '/subscription'
    },
    {
      label: 'Profile',
      icon: '👤',
      route: '/profile'
    },
    {
      label: 'Settings',
      icon: '⚙️',
      route: '/settings'
    }
  ];

  getUserInitials(): string {
    const email = this.authService.currentUser()?.email || '';
    return email.charAt(0).toUpperCase();
  }
}
