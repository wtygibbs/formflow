import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  // Clone request with auth token if available
  let clonedRequest = req;
  if (token && !req.url.includes('/auth/refresh')) {
    clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      },
      withCredentials: true // Include cookies for refresh token
    });
  } else if (req.url.includes('/auth/')) {
    // Include credentials for all auth endpoints
    clonedRequest = req.clone({
      withCredentials: true
    });
  }

  return next(clonedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 401 Unauthorized errors
      if (error.status === 401 && !req.url.includes('/auth/login') && !req.url.includes('/auth/refresh')) {
        // Prevent multiple simultaneous refresh attempts
        if (!isRefreshing) {
          isRefreshing = true;

          return authService.refreshToken().pipe(
            switchMap((response: any) => {
              isRefreshing = false;

              // Update the token in auth service
              authService.setTokenFromRefresh(response.token);

              // Retry the original request with new token
              const retryRequest = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${response.token}`
                },
                withCredentials: true
              });

              return next(retryRequest);
            }),
            catchError((refreshError) => {
              isRefreshing = false;

              // Refresh failed, logout user
              authService.logout();
              router.navigate(['/login']);

              return throwError(() => refreshError);
            })
          );
        }
      }

      return throwError(() => error);
    })
  );
};
