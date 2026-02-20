import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { catchError, switchMap, filter, take, finalize } from 'rxjs/operators';
import { throwError, BehaviorSubject, Observable } from 'rxjs';

/**
 * HTTP Interceptor that adds JWT token to outgoing requests and handles token refresh
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const token = authService.getToken();

    // Public endpoints that strictly do NOT need a token
    const publicEndpoints = [
        '/auth/login',
        '/auth/register',
        '/auth/refresh-token',
        '/auth/verify-email',
        '/auth/forgot-password',
        '/auth/reset-password',
        '/auth/resend-otp'
    ];

    const isPublic = publicEndpoints.some(endpoint => req.url.includes(endpoint));

    if (isPublic) {
        return next(req);
    }

    let authReq = addToken(req, token);

    return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401) {
                return handle401Error(req, next, authService, router);
            }

            if (error.status === 403) {
                authService.logout();
                router.navigate(['/auth/login'], {
                    queryParams: { message: 'session_expired' }
                });
            }
            return throwError(() => error);
        })
    );
};

let isRefreshing = false;
const refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

function addToken(request: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
    if (!token) return request;
    return request.clone({
        setHeaders: {
            Authorization: `Bearer ${token}`
        }
    });
}

function handle401Error(request: HttpRequest<unknown>, next: HttpHandlerFn, authService: AuthService, router: Router): Observable<HttpEvent<unknown>> {
    if (!isRefreshing) {
        isRefreshing = true;
        refreshTokenSubject.next(null);

        return authService.refreshToken().pipe(
            switchMap((response) => {
                isRefreshing = false;
                refreshTokenSubject.next(response.token);
                return next(addToken(request, response.token));
            }),
            catchError((err) => {
                isRefreshing = false;
                authService.logout();
                router.navigate(['/auth/login'], { queryParams: { message: 'session_expired' } });
                return throwError(() => err);
            })
        );
    } else {
        return refreshTokenSubject.pipe(
            filter(token => token != null),
            take(1),
            switchMap(jwt => {
                return next(addToken(request, jwt));
            })
        );
    }
}
