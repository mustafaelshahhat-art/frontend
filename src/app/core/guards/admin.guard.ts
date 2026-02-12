import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthStore } from '../stores/auth.store';
import { UserRole } from '../models/user.model';

export const adminGuard: CanActivateFn = () => {
    const authStore = inject(AuthStore);
    const router = inject(Router);

    const user = authStore.currentUser();
    const isAuthenticated = authStore.isAuthenticated();

    if (!isAuthenticated || !user) {
        return router.createUrlTree(['/auth/login']);
    }

    if (user.role === UserRole.ADMIN) {
        return true;
    }

    return router.createUrlTree(['/unauthorized']);
};
