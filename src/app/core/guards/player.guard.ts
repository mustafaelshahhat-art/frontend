import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthStore } from '../stores/auth.store';
import { UserRole } from '../models/user.model';

export const playerGuard: CanActivateFn = () => {
    const authStore = inject(AuthStore);
    const router = inject(Router);

    const user = authStore.currentUser();
    const isAuthenticated = authStore.isAuthenticated();

    if (!isAuthenticated || !user) {
        return router.createUrlTree(['/auth/login']);
    }

    // Players, Creators, and Admins can access player routes
    // (Essentially any authenticated user with a valid role)
    if (Object.values(UserRole).includes(user.role as UserRole)) {
        return true;
    }

    return router.createUrlTree(['/unauthorized']);
};
