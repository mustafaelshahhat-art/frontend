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
                path: 'team',
                loadComponent: () => import('./team/my-team-detail.component').then(m => m.MyTeamDetailComponent),
                data: { breadcrumb: 'فريقي', icon: 'groups' }
            },
            {
                path: 'team/add-player',
                loadComponent: () => import('./team/player-form/player-form.component').then(m => m.PlayerFormComponent),
                data: { breadcrumb: 'إضافة لاعب' }
            },
            {
                path: 'team/edit-player/:id',
                loadComponent: () => import('./team/player-form/player-form.component').then(m => m.PlayerFormComponent),
                data: { breadcrumb: 'تعديل لاعب' }
            },
            {
                path: 'championships',
                loadComponent: () => import('../features/tournaments/pages/tournaments-list/tournaments-list.component').then(m => m.TournamentsListComponent),
                data: { breadcrumb: 'البطولات', icon: 'emoji_events' }
            },
            {
                path: 'championships/register/:id',
                loadComponent: () => import('./championships/registration/championship-registration.component').then(m => m.ChampionshipRegistrationComponent),
                data: { breadcrumb: 'التسجيل في البطولة' }
            },
            {
                path: 'championships/:id',
                loadComponent: () => import('../features/tournaments/pages/tournament-detail/tournament-detail.component').then(m => m.TournamentDetailComponent),
                data: { breadcrumb: 'تفاصيل البطولة' }
            },
            {
                path: 'matches',
                loadComponent: () => import('../features/matches/pages/matches-list/matches-list.component').then(m => m.MatchesListComponent),
                data: { breadcrumb: 'المباريات', icon: 'sports_soccer' }
            },
            {
                path: 'matches/:id',
                loadComponent: () => import('../features/matches/pages/match-detail/match-detail.component').then(m => m.MatchDetailComponent),
                data: { breadcrumb: 'تفاصيل المباراة' }
            },
            {
                path: 'matches/:id/chat',
                loadComponent: () => import('../features/matches/pages/match-chat/match-chat.component').then(m => m.MatchChatComponent),
                data: { breadcrumb: 'محادثة المباراة' }
            },
            {
                path: 'objections',
                loadComponent: () => import('../features/objections/pages/objections-list/objections-list.component').then(m => m.ObjectionsListComponent),
                canActivate: [permissionGuard([Permission.VIEW_OBJECTIONS])],
                data: { breadcrumb: 'الاعتراضات', icon: 'gavel' }
            },
            {
                path: 'notifications',
                loadComponent: () => import('../features/notifications/pages/notifications/notifications.component').then(m => m.NotificationsComponent),
                data: { breadcrumb: 'الإشعارات', icon: 'notifications' }
            },
            {
                path: 'profile',
                loadComponent: () => import('../features/users/pages/profile/profile.component').then(m => m.ProfileComponent),
                data: { breadcrumb: 'الملف الشخصي', icon: 'person' }
            },
            {
                path: 'dashboard',
                redirectTo: 'team',
                pathMatch: 'full'
            },
            {
                path: '',
                redirectTo: 'team',
                pathMatch: 'full'
            }
        ]
    }
];
