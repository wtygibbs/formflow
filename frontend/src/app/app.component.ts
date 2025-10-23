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
      <header class="navbar bg-gradient-to-r from-primary to-secondary text-primary-content shadow-lg sticky top-0 z-50">
        <div class="navbar-start">
          <h1 class="text-2xl font-bold cursor-pointer hover:scale-105 transition-transform" routerLink="/">
            ACORD Parser
          </h1>
        </div>
        <div class="navbar-end gap-2">
          @if (authService.isAuthenticated()) {
            <a routerLink="/dashboard" class="btn btn-ghost">Dashboard</a>
            <a routerLink="/documents" class="btn btn-ghost">Documents</a>
            <a routerLink="/subscription" class="btn btn-ghost">Subscription</a>
            <button (click)="logout()" class="btn btn-outline btn-sm">Logout</button>
          } @else {
            <a routerLink="/login" class="btn btn-ghost">Login</a>
            <a routerLink="/register" class="btn btn-primary btn-sm">Sign Up</a>
          }
        </div>
      </header>

      <main class="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <router-outlet />
      </main>

      <footer class="footer footer-center p-10 bg-base-300 text-base-content">
        <div>
          <p class="font-semibold text-lg">ACORD Parser</p>
          <p>&copy; 2025 ACORD Parser. All rights reserved.</p>
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
