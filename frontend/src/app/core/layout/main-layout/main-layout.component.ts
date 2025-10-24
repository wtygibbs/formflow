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
    <div class="flex h-screen overflow-hidden bg-background">
      <!-- Sidenav - fixed height, scrollable content -->
      <app-sidenav class="flex-shrink-0" />

      <!-- Main content area -->
      <div class="flex flex-col flex-1 overflow-hidden">
        <!-- Navbar - fixed at top -->
        <app-navbar class="flex-shrink-0" />

        <!-- Page content - scrollable -->
        <main class="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div class="container mx-auto max-w-7xl">
            <router-outlet />
          </div>
        </main>
      </div>
    </div>
  `,
  styles: []
})
export class MainLayoutComponent {
  layoutService = inject(LayoutService);
}
