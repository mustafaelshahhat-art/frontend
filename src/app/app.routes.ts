import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    {
        path: 'auth',
        loadChildren: () => import('./auth/auth.routes').then(m => m.authRoutes)
    },
    {
        path: 'admin',
        loadChildren: () => import('./admin/admin.routes').then(m => m.adminRoutes),
        canActivate: [authGuard]
    },
    {
        path: 'referee',
        loadChildren: () => import('./referee/referee.routes').then(m => m.refereeRoutes),
        canActivate: [authGuard]
    },
    {
        path: 'captain',
        loadChildren: () => import('./captain/captain.routes').then(m => m.captainRoutes),
        canActivate: [authGuard]
    },
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
