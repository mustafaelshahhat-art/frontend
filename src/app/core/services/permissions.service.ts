import { Injectable, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Permission, ROLE_PERMISSIONS } from '../permissions/permissions.model';
import { UserRole, TeamRole } from '../models/user.model';
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

    /**
     * Ownership check for entities.
     * Can be expanded to check specific entity IDs if needed.
     */
    isOwner(entityCreatorId: string): boolean {
        const user = this.authService.getCurrentUser();
        return !!user && user.id === entityCreatorId;
    }

    /**
     * Contextual check for team management.
     */
    isTeamCaptain(teamId?: string): boolean {
        const user = this.authService.getCurrentUser();
        if (!user) return false;

        // Admins are honorary captains for all teams
        if (this.has(Permission.MANAGE_TEAMS)) return true;

        return user.teamRole === TeamRole.CAPTAIN && (!teamId || user.teamId === teamId);
    }

    canManageLiveMatch(matchStatus: MatchStatus): boolean {
        return this.has(Permission.MANAGE_MATCH_EVENTS) && matchStatus === MatchStatus.LIVE;
    }


}
