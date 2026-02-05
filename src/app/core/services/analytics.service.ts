import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';

export interface DashboardStats {
    totalUsers: number;
    activeTournaments: number;
    matchesToday: number;
    pendingObjections: number;
}

export interface Activity {
    type: string;
    message: string;
    time: string;
    userName?: string;
    action?: string;
    timestamp?: Date;
    status?: string;
}

@Injectable({
    providedIn: 'root'
})
export class AnalyticsService {
    private readonly http = inject(HttpClient);
    // TODO: Define actual API base URL
    private readonly apiUrl = 'api/analytics';

    getDashboardStats(): Observable<DashboardStats> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    getRecentActivities(): Observable<Activity[]> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }
}
