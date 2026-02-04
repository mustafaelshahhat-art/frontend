import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

/**
 * Role Guard Factory
 * Creates a guard that checks if user has required role(s)
 * 
 * Usage:
 * canActivate: [roleGuard([UserRole.ADMIN])]
 */
export function roleGuard(allowedRoles: UserRole[]): CanActivateFn {
    return (route, state) => {
        const authService = inject(AuthService);
        const router = inject(Router);

        // First check authentication
        if (!authService.isAuthenticated()) {
            return router.createUrlTree(['/auth/login']);
        }

        // Check if user has allowed role
        if (authService.hasAnyRole(allowedRoles)) {
            return true;
        }

        // User is authenticated but doesn't have permission
        // Redirect to their role's default dashboard
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
            switch (currentUser.role) {
                case UserRole.ADMIN:
                    return router.createUrlTree(['/admin/dashboard']);
                case UserRole.REFEREE:
                    return router.createUrlTree(['/referee/dashboard']);
                case UserRole.CAPTAIN:
                    return router.createUrlTree(['/captain/dashboard']);
                default:
                    return router.createUrlTree(['/auth/login']);
            }
        }

        return router.createUrlTree(['/auth/login']);
    };
}
