import { Routes } from '@angular/router';
import { permissionGuard } from '../core/guards/permission.guard';
import { Permission } from '../core/permissions/permissions.model';
import { RefereeLayoutComponent } from '../layouts/referee-layout/referee-layout.component';

export const refereeRoutes: Routes = [
    {
        path: '',
        component: RefereeLayoutComponent,
        canActivate: [permissionGuard([Permission.START_MATCH])],
        children: [
            {
                path: 'dashboard',
                loadComponent: () => import('./dashboard/dashboard.component').then(m => m.RefereeDashboardComponent)
            },
            {
                path: 'matches',
                loadComponent: () => import('../features/matches/pages/matches-list/matches-list.component').then(m => m.MatchesListComponent)
            },
            {
                path: 'matches/:id',
                loadComponent: () => import('../features/matches/pages/match-detail/match-detail.component').then(m => m.MatchDetailComponent)
            },
            {
                path: 'matches/:id/chat',
                loadComponent: () => import('../features/matches/pages/match-chat/match-chat.component').then(m => m.MatchChatComponent)
            },
            {
                path: 'notifications',
                loadComponent: () => import('../features/notifications/pages/notifications/notifications.component').then(m => m.NotificationsComponent)
            },
            {
                path: 'profile',
                loadComponent: () => import('../features/users/pages/profile/profile.component').then(m => m.ProfileComponent)
            },
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            }
        ]
    }
];
