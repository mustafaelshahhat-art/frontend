import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
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

    // Skip auth header for login/register/refresh endpoints
    if (req.url.includes('/auth/')) {
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

function addToken(request: HttpRequest<any>, token: string | null): HttpRequest<any> {
    if (!token) return request;
    return request.clone({
        setHeaders: {
            Authorization: `Bearer ${token}`
        }
    });
}

function handle401Error(request: HttpRequest<any>, next: HttpHandlerFn, authService: AuthService, router: Router): Observable<any> {
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
