import { Injectable, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Permission, ROLE_PERMISSIONS } from '../permissions/permissions.model';
import { UserRole } from '../models/user.model';
import { MatchStatus } from '../models/tournament.model';

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

    /**
     * Checks if current user can manage live match controls (Referee only, Live matches only).
     * Used for referee-specific actions like "مركز التحكم", "تسجيل حدث", "تسجيل حدث جديد".
     */
    canManageLiveMatch(matchStatus: MatchStatus): boolean {
        // Must be Referee (has START_MATCH but NOT MANAGE_MATCHES to exclude Admin)
        const isReferee = this.hasPermission(Permission.START_MATCH) &&
            !this.hasPermission(Permission.MANAGE_MATCHES);
        // Match must be Live
        return isReferee && matchStatus === MatchStatus.LIVE;
    }

    /**
     * Checks if current user can submit objections (Player only, Finished matches only).
     * Used for "تقديم اعتراض" section visibility.
     */
    canSubmitObjection(matchStatus: MatchStatus): boolean {
        // Must be Player (has CREATE_OBJECTION but NOT START_MATCH to exclude Referee)
        const isPlayer = this.hasPermission(Permission.CREATE_OBJECTION) &&
            !this.hasPermission(Permission.START_MATCH);
        // Match must be Finished or Cancelled
        return isPlayer && (matchStatus === MatchStatus.FINISHED || matchStatus === MatchStatus.CANCELLED);
    }
}
