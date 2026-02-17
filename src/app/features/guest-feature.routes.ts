import { Routes } from '@angular/router';
import { tournamentRoutes } from './shared-feature.routes';

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
