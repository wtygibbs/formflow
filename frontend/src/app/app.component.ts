import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  template: `
    <div class="min-h-screen flex flex-col bg-background">
      <header class="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div class="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <h1 class="text-xl font-semibold cursor-pointer hover:opacity-80 transition-opacity" routerLink="/">
            ACORD Parser
          </h1>
          <nav class="flex items-center gap-1">
            @if (authService.isAuthenticated()) {
              <a routerLink="/dashboard" class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                Dashboard
              </a>
              <a routerLink="/documents" class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                Documents
              </a>
              <a routerLink="/subscription" class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                Subscription
              </a>
              <button (click)="logout()" class="ml-2 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                Logout
              </button>
            } @else {
              <a routerLink="/login" class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                Login
              </a>
              <a routerLink="/register" class="ml-2 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
                Sign Up
              </a>
            }
          </nav>
        </div>
      </header>

      <main class="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <router-outlet />
      </main>

      <footer class="border-t border-border">
        <div class="container mx-auto flex flex-col items-center gap-4 py-10 text-center md:h-24 md:flex-row md:justify-between md:py-0">
          <div class="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
            <p class="text-sm text-muted-foreground">
              &copy; 2025 ACORD Parser. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: []
})
export class AppComponent {
  authService = inject(AuthService);
  router = inject(Router);

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
