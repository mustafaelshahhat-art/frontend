import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PermissionsService } from '../services/permissions.service';
import { Permission } from '../permissions/permissions.model';

/**
 * Permission Guard Factory
 * Creates a guard that checks if user has required permission(s)
 * 
 * Usage:
 * canActivate: [permissionGuard([Permission.VIEW_USERS])]
 */
export function permissionGuard(requiredPermissions: Permission[]): CanActivateFn {
    return () => {
        const authService = inject(AuthService);
        const permissionsService = inject(PermissionsService);
        const router = inject(Router);

        // First check authentication
        if (!authService.isAuthenticated()) {
            return router.createUrlTree(['/auth/login']);
        }

        // Check if user has ANY of the required permissions
        if (permissionsService.hasAny(requiredPermissions)) {
            return true;
        }

        // User is authenticated but doesn't have permission
        // Redirect to unauthorized or home based on what they CAN do
        // For now, simpler redirect to a known safe route or unauthorized page
        return router.createUrlTree(['/unauthorized']);
        // Note: We might want to be smarter here, but 'unauthorized' is standard.
    };
}
