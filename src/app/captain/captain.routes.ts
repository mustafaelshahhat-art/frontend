import { Routes } from '@angular/router';
import { roleGuard } from '../core/guards/role.guard';
import { UserRole } from '../core/models/user.model';
import { CaptainLayoutComponent } from '../shared/layout/captain-layout/captain-layout.component';

export const captainRoutes: Routes = [
    {
        path: '',
        component: CaptainLayoutComponent,
        canActivate: [roleGuard([UserRole.CAPTAIN])],
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
                loadComponent: () => import('../shared/pages/tournaments-list/tournaments-list.component').then(m => m.TournamentsListComponent)
            },
            {
                path: 'championships/register/:id',
                loadComponent: () => import('./championships/registration/championship-registration.component').then(m => m.ChampionshipRegistrationComponent)
            },
            {
                path: 'championships/:id',
                loadComponent: () => import('../shared/pages/tournament-detail/tournament-detail.component').then(m => m.TournamentDetailComponent)
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
                loadComponent: () => import('./matches/match-chat/match-chat.component').then(m => m.MatchChatComponent)
            },
            {
                path: 'objections',
                loadComponent: () => import('../shared/pages/objections-list/objections-list.component').then(m => m.ObjectionsListComponent)
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
