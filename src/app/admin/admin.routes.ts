import { Routes } from '@angular/router';
import { permissionGuard } from '../core/guards/permission.guard';
import { Permission } from '../core/permissions/permissions.model';
import { AdminLayoutComponent } from '../layouts/admin-layout/admin-layout.component';

export const adminRoutes: Routes = [
    {
        path: '',
        component: AdminLayoutComponent,
        canActivate: [permissionGuard([Permission.MANAGE_USERS])],
        children: [
            {
                path: 'dashboard',
                loadComponent: () => import('./dashboard/dashboard.component').then(m => m.AdminDashboardComponent),
                data: { breadcrumb: 'لوحة التحكم', icon: 'dashboard' }
            },
            {
                path: 'objections',
                loadComponent: () => import('../features/objections/pages/objections-list/objections-list.component').then(m => m.ObjectionsListComponent),
                data: { breadcrumb: 'الاعتراضات', icon: 'gavel' }
            },
            {
                path: 'objections/:id',
                loadComponent: () => import('../features/objections/pages/objection-detail/objection-detail.component').then(m => m.ObjectionDetailComponent),
                data: { breadcrumb: 'تفاصيل الاعتراض' }
            },
            {
                path: 'tournaments',
                loadComponent: () => import('../features/tournaments/pages/tournaments-list/tournaments-list.component').then(m => m.TournamentsListComponent),
                data: { breadcrumb: 'البطولات', icon: 'emoji_events' }
            },
            {
                path: 'tournaments/new',
                loadComponent: () => import('../features/tournaments/pages/tournament-manage/tournament-manage.component').then(m => m.TournamentManageComponent),
                data: { breadcrumb: 'إنشاء بطولة' }
            },
            {
                path: 'tournaments/edit/:id',
                loadComponent: () => import('../features/tournaments/pages/tournament-manage/tournament-manage.component').then(m => m.TournamentManageComponent),
                data: { breadcrumb: 'تعديل بطولة' }
            },
            {
                path: 'tournaments/:id',
                loadComponent: () => import('../features/tournaments/pages/tournament-detail/tournament-detail.component').then(m => m.TournamentDetailComponent),
                data: { breadcrumb: 'تفاصيل البطولة' }
            },
            {
                path: 'users',
                loadComponent: () => import('./users/users-list.component').then(m => m.UsersListComponent),
                data: { breadcrumb: 'المستخدمين', icon: 'person' }
            },
            {
                path: 'users/:id',
                loadComponent: () => import('./users/user-detail/user-detail.component').then(m => m.UserDetailComponent),
                data: { breadcrumb: 'تفاصيل المستخدم' }
            },
            {
                path: 'teams',
                loadComponent: () => import('../features/teams/pages/teams-list.component').then(m => m.TeamsListComponent),
                data: { breadcrumb: 'الفرق', icon: 'groups' }
            },
            {
                path: 'teams/:id',
                loadComponent: () => import('../features/teams/pages/team-detail/team-detail.component').then(m => m.TeamDetailPageComponent),
                data: { breadcrumb: 'تفاصيل الفريق' }
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
                path: 'notifications',
                loadComponent: () => import('../features/notifications/pages/notifications/notifications.component').then(m => m.NotificationsComponent),
                data: { breadcrumb: 'الإشعارات', icon: 'notifications' }
            },
            {
                path: 'payment-requests',
                loadComponent: () => import('./payment-requests/payment-requests.component').then(m => m.PaymentRequestsComponent),
                data: { breadcrumb: 'الطلبات المالية', icon: 'payments' }
            },
            {
                path: 'activity-log',
                loadComponent: () => import('./activity-log/activity-log.component').then(m => m.ActivityLogComponent),
                data: { breadcrumb: 'سجل النشاطات', icon: 'history' }
            },

            {
                path: 'settings',
                loadComponent: () => import('./settings/settings.component').then(m => m.SettingsComponent),
                data: { breadcrumb: 'الإعدادات', icon: 'settings' }
            },
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            }
        ]
    }
];
