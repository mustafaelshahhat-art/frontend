import { Routes } from '@angular/router';
import { tournamentRoutes, matchRoutes, teamDetailRoute } from './shared-feature.routes';

export const guestRoutes: Routes = [
    {
        path: '',
        children: [
            ...tournamentRoutes(),
            {
                path: '',
                redirectTo: 'tournaments',
                pathMatch: 'full'
            }
        ]
    }
];
