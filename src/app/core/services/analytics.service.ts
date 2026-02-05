import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, map } from 'rxjs';
import { environment } from '../../../environments/environment';

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
    private readonly apiUrl = `${environment.apiUrl}/Analytics`;

    getDashboardStats(): Observable<DashboardStats> {
        return this.http.get<any>(`${this.apiUrl}/overview`).pipe(
            map(data => ({
                totalUsers: data.totalUsers,
                activeTournaments: data.activeTournaments,
                matchesToday: data.matchesToday,
                pendingObjections: data.pendingObjections
            }))
        );
    }

    getRecentActivities(): Observable<Activity[]> {
        return this.http.get<any[]>(`${this.apiUrl}/activities`).pipe(
            map(data => data.map(item => ({
                type: item.type,
                message: item.message,
                time: this.formatRelativeTime(new Date(item.timestamp)),
                userName: item.userName,
                action: item.action,
                timestamp: new Date(item.timestamp)
            })))
        );
    }

    private formatRelativeTime(date: Date): string {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'الآن';
        if (minutes < 60) return `منذ ${minutes} دقيقة`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `منذ ${hours} ساعة`;
        return date.toLocaleDateString('ar-EG');
    }
}
