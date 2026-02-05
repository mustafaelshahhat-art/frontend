import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Authentication Guard
 * Prevents unauthenticated users from accessing protected routes
 */
export const authGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isAuthenticated()) {
        return true;
    }

    // Store the attempted URL for redirecting
    const returnUrl = state.url;

    // Redirect to login
    return router.createUrlTree(['/auth/login'], {
        queryParams: { returnUrl }
    });
};
