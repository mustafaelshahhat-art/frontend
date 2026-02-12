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

    has(permission: Permission): boolean {
        const user = this.authService.getCurrentUser();
        if (!user) return false;

        const rolePermissions = ROLE_PERMISSIONS[user.role as UserRole] || [];
        return rolePermissions.includes(permission);
    }

    hasAny(permissions: Permission[]): boolean {
        const user = this.authService.getCurrentUser();
        if (!user) return false;

        const rolePermissions = ROLE_PERMISSIONS[user.role as UserRole] || [];
        return permissions.some(p => rolePermissions.includes(p));
    }

    canManageLiveMatch(matchStatus: MatchStatus): boolean {
        return this.has(Permission.MANAGE_MATCH_EVENTS) && matchStatus === MatchStatus.LIVE;
    }

    canSubmitObjection(matchStatus: MatchStatus): boolean {
        return this.has(Permission.CREATE_OBJECTION) &&
            (matchStatus === MatchStatus.FINISHED || matchStatus === MatchStatus.CANCELLED);
    }
}
