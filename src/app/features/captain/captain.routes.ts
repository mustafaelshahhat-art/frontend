import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/permission.guard';
import { Permission } from '../../core/permissions/permissions.model';
import { CaptainLayoutComponent } from '../../layouts/captain-layout/captain-layout.component';
import {
    matchRoutes,
    teamDetailRoute,
    notificationRoutes,
    profileRoutes
} from '../shared-feature.routes';

export const captainRoutes: Routes = [
    {
        path: '',
        component: CaptainLayoutComponent,
        canActivate: [permissionGuard([Permission.MANAGE_MY_TEAM])],
        children: [
            // ─── Captain-specific routes ─────────────────────
            {
                path: 'team',
                loadComponent: () => import('../teams/pages/my-teams/my-teams.component').then(m => m.MyTeamsComponent),
                data: { breadcrumb: 'فريقي', icon: 'groups' }
            },
            {
                path: 'team/:id',
                loadComponent: () => import('../teams/pages/team-detail/team-detail.component').then(m => m.TeamDetailPageComponent),
                data: { breadcrumb: 'تفاصيل الفريق' }
            },
            {
                path: 'championships',
                loadComponent: () => import('../tournaments/pages/tournaments-list/tournaments-list.component').then(m => m.TournamentsListComponent),
                data: { breadcrumb: 'البطولات', icon: 'emoji_events' }
            },
            {
                path: 'championships/:id',
                loadComponent: () => import('../tournaments/pages/tournament-detail/tournament-detail.component').then(m => m.TournamentDetailComponent),
                data: { breadcrumb: 'تفاصيل البطولة' }
            },
            {
                path: 'objections',
                loadComponent: () => import('../objections/pages/objections-list/objections-list.component').then(m => m.ObjectionsListComponent),
                canActivate: [permissionGuard([Permission.VIEW_OBJECTIONS])],
                data: { breadcrumb: 'الاعتراضات', icon: 'gavel' }
            },

            // ─── Shared feature routes ───────────────────────
            ...matchRoutes(),          // /captain/matches, /:id, /:id/chat
            ...teamDetailRoute(),      // /captain/teams/:id  (shared detail page)
            ...notificationRoutes(),   // /captain/notifications
            ...profileRoutes(),        // /captain/profile

            // ─── Default redirect ────────────────────────────
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
