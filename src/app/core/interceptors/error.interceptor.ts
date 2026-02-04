import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ErrorHandlerService } from '../../shared/services/error-handler.service';
import { Router } from '@angular/router';

/**
 * HTTP Error Interceptor
 * Catches all HTTP errors and handles them appropriately
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const errorHandler = inject(ErrorHandlerService);
    const router = inject(Router);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            // Handle the error
            const appError = errorHandler.handleHttpError(error);

            // Redirect on auth errors
            if (error.status === 401) {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('current_user');
                router.navigate(['/auth/login']);
            }

            // Redirect on forbidden errors
            if (error.status === 403) {
                router.navigate(['/unauthorized']);
            }

            return throwError(() => appError);
        })
    );
};
