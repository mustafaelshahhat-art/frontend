import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { PagedResult } from '../models/pagination.model';
import { environment } from '../../../environments/environment';

export interface DashboardStats {
    totalUsers: number;
    totalTeams: number;
    activeTournaments: number;
    matchesToday: number;
    totalGoals: number;
    loginsToday: number;
}

export interface TeamStats {
    playerCount: number;
    upcomingMatches: number;
    activeTournaments: number;
    rank: string;
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
        return this.http.get<unknown>(`${this.apiUrl}/overview`).pipe(
            map(data => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-restricted-syntax
                const d = data as any;
                return {
                    totalUsers: d.totalUsers,
                    totalTeams: d.totalTeams,
                    activeTournaments: d.activeTournaments,
                    matchesToday: d.matchesToday,

                    totalGoals: d.totalGoals,
                    loginsToday: d.loginsToday
                };
            })
        );
    }

    getTeamStats(teamId: string): Observable<TeamStats> {
        return this.http.get<TeamStats>(`${this.apiUrl}/overview`, { params: { teamId } });
    }

    getRecentActivities(): Observable<Activity[]> {
        return this.http.get<PagedResult<any>>(`${this.apiUrl}/activities`).pipe(
            map(paged => (paged.items || []).map(item => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-restricted-syntax
                const it = item as any;
                return {
                    type: it.type || it.Type || '',
                    message: this.cleanMessage(it.message || it.Message || ''),
                    time: '', // Deprecated, will use pipe on timestamp
                    userName: it.userName || it.UserName,
                    action: it.action || it.Action,
                    timestamp: new Date(it.timestamp || it.Timestamp),
                    status: it.status || it.Status
                };
            }))
        );
    }

    migrateLogs(): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/migrate-logs`, {});
    }

    private cleanMessage(msg: string): string {
        // Migration logic is now handled in the backend ActivityLogMigrationService.
        // We keep this method simple for future-proofing or minor string adjustments.
        return msg || '';
    }
}
