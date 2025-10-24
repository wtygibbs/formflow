import { Component, inject, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';
import { AuthService } from './core/services/auth.service';
import { SignalRService } from './core/services/signalr.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HlmToasterImports],
  template: `
    <hlm-toaster />
    <router-outlet />
  `,
  styles: []
})
export class AppComponent {
  authService = inject(AuthService);
  signalRService = inject(SignalRService);

  constructor() {
    // Initialize SignalR connection when user is authenticated
    effect(() => {
      if (this.authService.isAuthenticated()) {
        const token = this.authService.getToken();
        if (token && !this.signalRService.isConnected()) {
          this.signalRService.startConnection(token).catch(error => {
            console.error('Failed to start SignalR connection:', error);
          });
        }
      } else {
        if (this.signalRService.isConnected()) {
          this.signalRService.stopConnection();
        }
      }
    });
  }
}
