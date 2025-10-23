import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  template: `
    <div class="app-container">
      <header class="header">
        <div class="header-content">
          <h1 class="logo" routerLink="/">ACORD Parser</h1>
          <nav class="nav">
            @if (authService.isAuthenticated()) {
              <a routerLink="/dashboard" class="nav-link">Dashboard</a>
              <a routerLink="/documents" class="nav-link">Documents</a>
              <a routerLink="/subscription" class="nav-link">Subscription</a>
              <button (click)="logout()" class="btn-logout">Logout</button>
            } @else {
              <a routerLink="/login" class="nav-link">Login</a>
              <a routerLink="/register" class="nav-link btn-primary">Sign Up</a>
            }
          </nav>
        </div>
      </header>

      <main class="main-content">
        <router-outlet />
      </main>

      <footer class="footer">
        <p>&copy; 2025 ACORD Parser. All rights reserved.</p>
      </footer>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1rem 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .logo {
      margin: 0;
      font-size: 1.5rem;
      cursor: pointer;
      font-weight: 600;
    }

    .nav {
      display: flex;
      gap: 1.5rem;
      align-items: center;
    }

    .nav-link {
      color: white;
      text-decoration: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      transition: background-color 0.3s;
    }

    .nav-link:hover {
      background-color: rgba(255,255,255,0.1);
    }

    .btn-primary {
      background-color: white;
      color: #667eea;
      font-weight: 600;
    }

    .btn-primary:hover {
      background-color: rgba(255,255,255,0.9);
    }

    .btn-logout {
      background: none;
      border: 1px solid white;
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.3s;
    }

    .btn-logout:hover {
      background-color: white;
      color: #667eea;
    }

    .main-content {
      flex: 1;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem 1rem;
      width: 100%;
    }

    .footer {
      background-color: #f8f9fa;
      padding: 2rem 1rem;
      text-align: center;
      color: #6c757d;
    }

    .footer p {
      margin: 0;
    }
  `]
})
export class AppComponent {
  authService = inject(AuthService);
  router = inject(Router);

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
