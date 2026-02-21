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
            // Check if we should skip global error handling for this request
            if (req.headers.has('X-Skip-Error-Handler')) {
                return throwError(() => error);
            }

            // Handle the error
            const appError = errorHandler.handleHttpError(error);

            // 401 errors are handled exclusively by authInterceptor (token refresh / stale-token retry).
            // Re-throw the raw HttpErrorResponse so authInterceptor can detect status 401.
            const backendCode = error.error?.code;
            if (error.status === 401 && backendCode !== 'EMAIL_NOT_VERIFIED') {
                return throwError(() => error);
            }

            // Redirect on forbidden errors
            if (error.status === 403) {
                router.navigate(['/unauthorized']);
            }

            return throwError(() => appError);
        })
    );
};
