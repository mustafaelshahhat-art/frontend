import { Routes } from '@angular/router';
import { roleGuard } from '../core/guards/role.guard';
import { UserRole } from '../core/models/user.model';
import { RefereeLayoutComponent } from '../shared/layout/referee-layout/referee-layout.component';

export const refereeRoutes: Routes = [
    {
        path: '',
        component: RefereeLayoutComponent,
        canActivate: [roleGuard([UserRole.REFEREE])],
        children: [
            {
                path: 'dashboard',
                loadComponent: () => import('./dashboard/dashboard.component').then(m => m.RefereeDashboardComponent)
            },
            {
                path: 'matches',
                loadComponent: () => import('../shared/pages/matches-list/matches-list.component').then(m => m.MatchesListComponent)
            },
            {
                path: 'matches/:id',
                loadComponent: () => import('../shared/pages/match-detail/match-detail.component').then(m => m.MatchDetailComponent)
            },
            {
                path: 'matches/:id/chat',
                loadComponent: () => import('../captain/matches/match-chat/match-chat.component').then(m => m.MatchChatComponent)
            },
            {
                path: 'notifications',
                loadComponent: () => import('../shared/pages/notifications/notifications.component').then(m => m.NotificationsComponent)
            },
            {
                path: 'profile',
                loadComponent: () => import('../shared/pages/profile/profile.component').then(m => m.ProfileComponent)
            },
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            }
        ]
    }
];
