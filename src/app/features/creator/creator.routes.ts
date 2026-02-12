import { Routes } from '@angular/router';
import { creatorGuard } from '../../core/guards/creator.guard';
import { CreatorLayoutComponent } from '../../layouts/creator-layout/creator-layout.component';
import {
    matchRoutes,
    tournamentManagementRoutes,
    notificationRoutes,
    profileRoutes
} from '../shared-feature.routes';

export const creatorRoutes: Routes = [
    {
        path: '',
        component: CreatorLayoutComponent,
        canActivate: [creatorGuard],
        children: [
            // ─── Tournament Creator Specific ─────────────────
            ...tournamentManagementRoutes(),   // /creator/tournaments, /new, /edit/:id, /:id

            {
                path: 'payment-requests',
                loadComponent: () => import('../payments/payment-requests/payment-requests.component').then(m => m.PaymentRequestsComponent),
                data: { breadcrumb: 'الطلبات المالية', icon: 'payments' }
            },

            // ─── Shared feature routes ───────────────────────
            ...matchRoutes(),          // /creator/matches, /:id, /:id/chat

            ...notificationRoutes(),   // /creator/notifications
            ...profileRoutes(),        // /creator/profile

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
