import { Routes } from '@angular/router';
import { roleGuard } from '../core/guards/role.guard';
import { UserRole } from '../core/models/user.model';
import { AdminLayoutComponent } from '../layouts/admin-layout/admin-layout.component';

export const adminRoutes: Routes = [
    {
        path: '',
        component: AdminLayoutComponent,
        canActivate: [roleGuard([UserRole.ADMIN])],
        children: [
            {
                path: 'dashboard',
                loadComponent: () => import('./dashboard/dashboard.component').then(m => m.AdminDashboardComponent)
            },
            {
                path: 'objections',
                loadComponent: () => import('../features/objections/pages/objections-list/objections-list.component').then(m => m.ObjectionsListComponent)
            },
            {
                path: 'tournaments',
                loadComponent: () => import('../features/tournaments/pages/tournaments-list/tournaments-list.component').then(m => m.TournamentsListComponent)
            },
            {
                path: 'tournaments/:id',
                loadComponent: () => import('../features/tournaments/pages/tournament-detail/tournament-detail.component').then(m => m.TournamentDetailComponent)
            },
            {
                path: 'users',
                loadComponent: () => import('./users/users-list.component').then(m => m.UsersListComponent)
            },
            {
                path: 'users/:id',
                loadComponent: () => import('./users/user-detail/user-detail.component').then(m => m.UserDetailComponent)
            },
            {
                path: 'teams',
                loadComponent: () => import('../features/teams/pages/teams-list.component').then(m => m.TeamsListComponent)
            },
            {
                path: 'teams/:id',
                loadComponent: () => import('../features/teams/pages/team-detail/team-detail.component').then(m => m.TeamDetailComponent)
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
                path: 'payment-requests',
                loadComponent: () => import('./payment-requests/payment-requests.component').then(m => m.PaymentRequestsComponent)
            },
            {
                path: 'activity-log',
                loadComponent: () => import('./activity-log/activity-log.component').then(m => m.ActivityLogComponent)
            },

            {
                path: 'settings',
                loadComponent: () => import('./settings/settings.component').then(m => m.SettingsComponent)
            },
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            }
        ]
    }
];
