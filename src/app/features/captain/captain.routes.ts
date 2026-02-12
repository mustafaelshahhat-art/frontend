import { Routes } from '@angular/router';
import { CaptainGuard } from '../../core/guards/captain.guard';
import { TournamentCreatorLayoutComponent } from '../../layouts/tournament-creator-layout/tournament-creator-layout.component';
import {
    matchRoutes,
    tournamentManagementRoutes,
    objectionRoutes,
    notificationRoutes,
    profileRoutes
} from '../shared-feature.routes';

export const captainRoutes: Routes = [
    {
        path: '',
        component: TournamentCreatorLayoutComponent,
        canActivate: [CaptainGuard],
        children: [
            // ─── Tournament Creator Specific ─────────────────
            ...tournamentManagementRoutes(),   // /captain/tournaments, /new, /edit/:id, /:id

            {
                path: 'payment-requests',
                loadComponent: () => import('../admin/payment-requests/payment-requests.component').then(m => m.PaymentRequestsComponent),
                data: { breadcrumb: 'الطلبات المالية', icon: 'payments' }
            },

            // ─── Shared feature routes ───────────────────────
            ...matchRoutes(),          // /captain/matches, /:id, /:id/chat
            ...objectionRoutes(),      // /captain/objections, /:id
            ...notificationRoutes(),   // /captain/notifications
            ...profileRoutes(),        // /captain/profile

            // ─── Legacy/Compatibility ────────────────────────
            // If we still need to support Team Owners (Captains) and their team page
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

            // ─── Default redirect ────────────────────────────
            {
                path: 'dashboard',
                redirectTo: 'tournaments',
                pathMatch: 'full'
            },
            {
                path: '',
                redirectTo: 'tournaments',
                pathMatch: 'full'
            }
        ]
    }
];
