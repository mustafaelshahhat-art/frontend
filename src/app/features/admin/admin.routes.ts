import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/permission.guard';
import { Permission } from '../../core/permissions/permissions.model';
import { AdminLayoutComponent } from '../../layouts/admin-layout/admin-layout.component';
import {
    matchRoutes,
    teamRoutes,
    tournamentManagementRoutes,
    notificationRoutes
} from '../shared-feature.routes';

export const adminRoutes: Routes = [
    {
        path: '',
        component: AdminLayoutComponent,
        canActivate: [permissionGuard([Permission.VIEW_ADMIN_DASHBOARD])],
        children: [
            // ─── Admin-specific routes ───────────────────────
            {
                path: 'dashboard',
                loadComponent: () => import('./dashboard/dashboard.component').then(m => m.AdminDashboardComponent),
                canActivate: [permissionGuard([Permission.VIEW_ADMIN_DASHBOARD])],
                data: { breadcrumb: 'لوحة التحكم', icon: 'dashboard' }
            },
            {
                path: 'users',
                loadComponent: () => import('../users/pages/users-list/users-list.component').then(m => m.UsersListComponent),
                data: { breadcrumb: 'المستخدمين', icon: 'person' }
            },
            {
                path: 'users/:id',
                loadComponent: () => import('../users/pages/user-detail/user-detail.component').then(m => m.UserDetailComponent),
                data: { breadcrumb: 'تفاصيل المستخدم' }
            },
            {
                path: 'payment-requests',
                loadComponent: () => import('../payments/payment-requests/payment-requests.component').then(m => m.PaymentRequestsComponent),
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

            // ─── Shared feature routes ───────────────────────
            ...tournamentManagementRoutes(),   // /admin/tournaments, /new, /edit/:id, /:id
            ...matchRoutes(),                  // /admin/matches, /:id, /:id/chat
            ...teamRoutes(),                   // /admin/teams, /:id

            ...notificationRoutes(),           // /admin/notifications

            // ─── Default redirect ────────────────────────────
            {
                path: '',
                redirectTo: 'tournaments',
                pathMatch: 'full'
            }
        ]
    }
];
