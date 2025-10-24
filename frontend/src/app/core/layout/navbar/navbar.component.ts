import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { SignalRService } from '../../services/signalr.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, ...HlmButtonImports],
  template: `
    <header class="bg-card border-b h-16 flex items-center px-4 sticky top-0 z-40">
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
  router = inject(Router);

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  logout(): void {
    this.signalRService.stopConnection();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
