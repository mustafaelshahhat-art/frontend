import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

/**
 * HTTP Interceptor that adds JWT token to outgoing requests
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const token = authService.getToken();

    // Skip auth header for login/register endpoints
    if (req.url.includes('/auth/')) {
        return next(req);
    }

    let authReq = req;
    // Add Authorization header if token exists
    if (token) {
        authReq = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    }

    return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
            // 401: Unauthorized (Token expired or Invalid)
            // 403: Forbidden (User suspended or blocked by admin)
            if (error.status === 401 || error.status === 403) {
                authService.logout();
                router.navigate(['/auth/login'], {
                    queryParams: { message: 'session_expired' }
                });
            }
            return throwError(() => error);
        })
    );
};
