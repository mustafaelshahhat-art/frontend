import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/permission.guard';
import { Permission } from '../../core/permissions/permissions.model';
import { RefereeLayoutComponent } from '../../layouts/referee-layout/referee-layout.component';
import {
    matchRoutes,
    teamDetailRoute,
    notificationRoutes,
    profileRoutes
} from '../shared-feature.routes';

export const refereeRoutes: Routes = [
    {
        path: '',
        component: RefereeLayoutComponent,
        canActivate: [permissionGuard([Permission.START_MATCH])],
        children: [
            // ─── Shared feature routes ───────────────────────
            ...matchRoutes(),          // /referee/matches, /:id, /:id/chat
            ...teamDetailRoute(),      // /referee/teams/:id
            ...notificationRoutes(),   // /referee/notifications
            ...profileRoutes(),        // /referee/profile

            // ─── Default redirect ────────────────────────────
            {
                path: '',
                redirectTo: 'matches',
                pathMatch: 'full'
            }
        ]
    }
];
