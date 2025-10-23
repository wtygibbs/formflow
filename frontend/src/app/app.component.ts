import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  template: `
    <div class="min-h-screen flex flex-col bg-base-200">
      <header class="navbar bg-base-100 border-b border-base-300 sticky top-0 z-50">
        <div class="navbar-start">
          <h1 class="text-xl font-semibold cursor-pointer hover:opacity-80 transition-opacity" routerLink="/">
            ACORD Parser
          </h1>
        </div>
        <div class="navbar-end gap-1">
          @if (authService.isAuthenticated()) {
            <a routerLink="/dashboard" class="btn btn-ghost btn-sm">Dashboard</a>
            <a routerLink="/documents" class="btn btn-ghost btn-sm">Documents</a>
            <a routerLink="/subscription" class="btn btn-ghost btn-sm">Subscription</a>
            <button (click)="logout()" class="btn btn-outline btn-sm">Logout</button>
          } @else {
            <a routerLink="/login" class="btn btn-ghost btn-sm">Login</a>
            <a routerLink="/register" class="btn btn-primary btn-sm">Sign Up</a>
          }
        </div>
      </header>

      <main class="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <router-outlet />
      </main>

      <footer class="footer footer-center p-10 bg-base-100 border-t border-base-300 text-base-content">
        <div>
          <p class="text-sm">
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
  router = inject(Router);

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
