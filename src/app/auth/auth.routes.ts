import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';

export const authRoutes: Routes = [
    {
        path: 'login',
        component: LoginComponent
    },
    {
        path: 'register',
        loadComponent: () => import('./register/register.component').then(m => m.RegisterComponent)
    },
    {
        path: 'pending-approval',
        loadComponent: () => import('./pending-approval/pending-approval.component').then(m => m.PendingApprovalComponent)
    },
    {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
    }
];
