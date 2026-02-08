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
                loadComponent: () => import('./dashboard/dashboard.component').then(m => m.RefereeDashboardComponent),
                data: { breadcrumb: 'لوحة التحكم', icon: 'dashboard' }
            },
            {
                path: 'matches',
                loadComponent: () => import('../features/matches/pages/matches-list/matches-list.component').then(m => m.MatchesListComponent),
                data: { breadcrumb: 'مبارياتي', icon: 'sports_soccer' }
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
                path: 'teams/:id',
                loadComponent: () => import('./pages/team-detail/team-detail.component').then(m => m.RefereeTeamDetailComponent),
                data: { breadcrumb: 'تفاصيل الفريق' }
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
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            }
        ]
    }
];
