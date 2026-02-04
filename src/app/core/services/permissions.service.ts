import { Injectable, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Permission, ROLE_PERMISSIONS } from '../permissions/permissions.model';
import { UserRole } from '../models/user.model';

@Injectable({
    providedIn: 'root'
})
export class PermissionsService {
    private authService = inject(AuthService);

    /**
     * Checks if the current user has the required permission.
     */
    hasPermission(permission: Permission): boolean {
        const user = this.authService.getCurrentUser();
        if (!user) return false;

        const rolePermissions = ROLE_PERMISSIONS[user.role as UserRole] || [];
        return rolePermissions.includes(permission);
    }

    /**
     * Checks if the current user has any of the provided permissions.
     */
    hasAnyPermission(permissions: Permission[]): boolean {
        const user = this.authService.getCurrentUser();
        if (!user) return false;

        const rolePermissions = ROLE_PERMISSIONS[user.role as UserRole] || [];
        return permissions.some(p => rolePermissions.includes(p));
    }

    /**
     * Checks if the current user has all of the provided permissions.
     */
    hasAllPermissions(permissions: Permission[]): boolean {
        const user = this.authService.getCurrentUser();
        if (!user) return false;

        const rolePermissions = ROLE_PERMISSIONS[user.role as UserRole] || [];
        return permissions.every(p => rolePermissions.includes(p));
    }
}
