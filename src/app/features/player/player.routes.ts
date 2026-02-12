import { Routes } from '@angular/router';
import { playerGuard } from '../../core/guards/player.guard';
import { PlayerLayoutComponent } from '../../layouts/player-layout/player-layout.component';
import {
    matchRoutes,
    notificationRoutes,
    profileRoutes,
    tournamentRoutes
} from '../shared-feature.routes';

export const playerRoutes: Routes = [
    {
        path: '',
        component: PlayerLayoutComponent,
        canActivate: [playerGuard],
        children: [
            // ─── Player/Captain Specific ─────────────────────
            {
                path: 'team-management',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('../teams/pages/my-teams/my-teams.component').then(m => m.MyTeamsComponent),
                        data: { breadcrumb: 'إدارة الفريق', icon: 'groups' }
                    },
                    {
                        path: ':id',
                        loadComponent: () => import('../teams/pages/team-detail/team-detail.component').then(m => m.TeamDetailPageComponent),
                        data: { breadcrumb: 'تفاصيل الفريق' }
                    }
                ]
            },

            // ─── Shared feature routes ───────────────────────
            ...tournamentRoutes(),     // /player/tournaments
            ...matchRoutes(),          // /player/matches

            ...notificationRoutes(),   // /player/notifications
            ...profileRoutes(),        // /player/profile

            // ─── Default redirect ────────────────────────────
            {
                path: '',
                redirectTo: 'team-management',
                pathMatch: 'full'
            }
        ]
    }
];
