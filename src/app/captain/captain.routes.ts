import { Routes } from '@angular/router';
import { permissionGuard } from '../core/guards/permission.guard';
import { Permission } from '../core/permissions/permissions.model';
import { CaptainLayoutComponent } from '../layouts/captain-layout/captain-layout.component';

export const captainRoutes: Routes = [
    {
        path: '',
        component: CaptainLayoutComponent,
        canActivate: [permissionGuard([Permission.MANAGE_MY_TEAM])],
        children: [
            {
                path: 'dashboard',
                loadComponent: () => import('./dashboard/dashboard.component').then(m => m.CaptainDashboardComponent)
            },
            {
                path: 'team',
                loadComponent: () => import('./team/team-profile.component').then(m => m.TeamProfileComponent)
            },
            {
                path: 'team/add-player',
                loadComponent: () => import('./team/player-form/player-form.component').then(m => m.PlayerFormComponent)
            },
            {
                path: 'team/edit-player/:id',
                loadComponent: () => import('./team/player-form/player-form.component').then(m => m.PlayerFormComponent)
            },
            {
                path: 'championships',
                loadComponent: () => import('../features/tournaments/pages/tournaments-list/tournaments-list.component').then(m => m.TournamentsListComponent)
            },
            {
                path: 'championships/register/:id',
                loadComponent: () => import('./championships/registration/championship-registration.component').then(m => m.ChampionshipRegistrationComponent)
            },
            {
                path: 'championships/:id',
                loadComponent: () => import('../features/tournaments/pages/tournament-detail/tournament-detail.component').then(m => m.TournamentDetailComponent)
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
                path: 'objections',
                loadComponent: () => import('../features/objections/pages/objections-list/objections-list.component').then(m => m.ObjectionsListComponent)
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
