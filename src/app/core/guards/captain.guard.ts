import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthStore } from '../stores/auth.store';
import { UserRole } from '../models/user.model';

export const CaptainGuard: CanActivateFn = () => {
    const authStore = inject(AuthStore);
    const router = inject(Router);

    const user = authStore.currentUser();
    const isAuthenticated = authStore.isAuthenticated();

    if (!isAuthenticated || !user) {
        return router.createUrlTree(['/auth/login']);
    }

    // Allow Admins and Tournament Creators
    if (user.role === UserRole.ADMIN || user.role === UserRole.TOURNAMENT_CREATOR) {
        return true;
    }

    // If we still want to allow Team Owners (Captains) who are Players
    if (user.role === UserRole.PLAYER && user.isTeamOwner) {
        return true;
    }

    return router.createUrlTree(['/unauthorized']);
};
