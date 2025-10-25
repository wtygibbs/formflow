import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { APP_INITIALIZER } from '@angular/core';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
import { AuthService } from './app/core/services/auth.service';

/**
 * App initialization function - runs before app starts
 * This is the proper Angular pattern for initialization tasks
 */
function initializeApp(authService: AuthService) {
  return () => {
    // Load user profile if authenticated
    // This runs AFTER all services are initialized, so no circular dependency
    if (authService.isAuthenticated()) {
      return authService.loadCurrentUser();
    }
    return Promise.resolve();
  };
}

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AuthService],
      multi: true
    }
  ]
}).catch(err => console.error(err));
