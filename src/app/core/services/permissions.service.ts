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
        const isReferee = this.has(Permission.START_MATCH) && !this.has(Permission.MANAGE_MATCHES);
        return isReferee && matchStatus === MatchStatus.LIVE;
    }

    canSubmitObjection(matchStatus: MatchStatus): boolean {
        const isPlayer = this.has(Permission.CREATE_OBJECTION) && !this.has(Permission.START_MATCH);
        return isPlayer && (matchStatus === MatchStatus.FINISHED || matchStatus === MatchStatus.CANCELLED);
    }
}
