import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { CaptainGuard } from './core/guards/captain.guard';

export const routes: Routes = [
    // ─── Public routes ───────────────────────────────
    {
        path: 'auth',
        loadChildren: () => import('./features/auth/auth.routes').then(m => m.authRoutes)
    },

    // ─── Role-scoped routes ──────────────────────────
    {
        path: 'admin',
        loadChildren: () => import('./features/admin/admin.routes').then(m => m.adminRoutes),
        canActivate: [authGuard]
    },
    {
        path: 'captain',
        loadChildren: () => import('./features/captain/captain.routes').then(m => m.captainRoutes),
        canActivate: [CaptainGuard]
    },


    // ─── Shared utility routes ───────────────────────
    {
        path: 'unauthorized',
        loadComponent: () => import('./shared/pages/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent)
    },
    {
        path: '',
        redirectTo: '/auth/login',
        pathMatch: 'full'
    },
    {
        path: '**',
        loadComponent: () => import('./shared/pages/not-found/not-found.component').then(m => m.NotFoundComponent)
    }
];
