import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthStore } from '../stores/auth.store';
import { UserRole } from '../models/user.model';

export const creatorGuard: CanActivateFn = () => {
    const authStore = inject(AuthStore);
    const router = inject(Router);

    const user = authStore.currentUser();
    const isAuthenticated = authStore.isAuthenticated();

    if (!isAuthenticated || !user) {
        return router.createUrlTree(['/auth/login']);
    }

    // Strictly for Admins and Tournament Creators
    // PENDING users cannot access creator dashboard
    if ((user.role === UserRole.ADMIN || user.role === UserRole.TOURNAMENT_CREATOR) &&
        user.status !== 'Pending') {
        return true;
    }

    return router.createUrlTree(['/unauthorized']);
};
