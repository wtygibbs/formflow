import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { SidenavComponent } from '../sidenav/sidenav.component';
import { LayoutService } from '../../services/layout.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, SidenavComponent],
  template: `
    <div class="min-h-screen flex flex-col bg-background">
      <!-- Navbar -->
      <app-navbar />

      <!-- Main content area with sidenav -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Sidenav -->
        <app-sidenav />

        <!-- Page content -->
        <main class="flex-1 overflow-y-auto">
          <div class="container mx-auto px-4 py-8 max-w-7xl">
            <router-outlet />
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
    }
  `]
})
export class MainLayoutComponent {
  layoutService = inject(LayoutService);
}
