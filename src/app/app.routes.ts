import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { creatorGuard } from './core/guards/creator.guard';
import { playerGuard } from './core/guards/player.guard';

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
        canActivate: [adminGuard]
    },
    {
        path: 'creator',
        loadChildren: () => import('./features/creator/creator.routes').then(m => m.creatorRoutes),
        canActivate: [creatorGuard]
    },
    {
        path: 'player',
        loadChildren: () => import('./features/player/player.routes').then(m => m.playerRoutes),
        canActivate: [playerGuard]
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
