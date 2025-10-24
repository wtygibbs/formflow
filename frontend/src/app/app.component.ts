import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmToasterComponent } from '@spartan-ng/helm/sonner';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, ...HlmButtonImports, HlmToasterComponent],
  template: `
    <div class="min-h-screen flex flex-col bg-background">
      <hlm-toaster />
      <header class="bg-card border-b sticky top-0 z-50">
        <div class="container mx-auto px-4 py-3 flex items-center justify-between max-w-7xl">
          <h1 class="text-xl font-semibold cursor-pointer hover:opacity-80 transition-opacity" routerLink="/">
            ACORD Parser
          </h1>
          <nav class="flex items-center gap-2">
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
              <a hlmBtn variant="ghost" size="sm" routerLink="/dashboard">Dashboard</a>
              <a hlmBtn variant="ghost" size="sm" routerLink="/documents">Documents</a>
              <a hlmBtn variant="ghost" size="sm" routerLink="/subscription">Subscription</a>
              <button hlmBtn variant="outline" size="sm" (click)="logout()">Logout</button>
            } @else {
              <a hlmBtn variant="ghost" size="sm" routerLink="/login">Login</a>
              <a hlmBtn size="sm" routerLink="/register">Sign Up</a>
            }
          </nav>
        </div>
      </header>

      <main class="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <router-outlet />
      </main>

      <footer class="bg-card border-t">
        <div class="container mx-auto px-4 py-10 text-center max-w-7xl">
          <p class="text-sm text-muted-foreground">
            &copy; 2025 ACORD Parser. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  `,
  styles: []
})
export class AppComponent {
  authService = inject(AuthService);
  themeService = inject(ThemeService);
  router = inject(Router);

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
