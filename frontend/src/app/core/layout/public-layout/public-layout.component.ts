import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent],
  template: `
    <div class="min-h-screen flex flex-col bg-background">
      <!-- Navbar -->
      <app-navbar />

      <!-- Main content -->
      <main class="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <router-outlet />
      </main>

      <!-- Footer -->
      <footer class="bg-card border-t">
        <div class="container mx-auto px-4 py-10 text-center max-w-7xl">
          <p class="text-sm text-muted-foreground">
            &copy; 2025 ACORD Parser. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class PublicLayoutComponent {}
