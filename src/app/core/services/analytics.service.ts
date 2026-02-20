import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
    id?: string;
    type: string;
    actionType?: string;
    message: string;
    time: string;
    userName?: string;
    action?: string;
    timestamp?: Date;
    severity?: string;
    actorRole?: string;
    entityType?: string;
    entityId?: string;
    entityName?: string;
}

export interface ActivityFilterParams {
    page?: number;
    pageSize?: number;
    entityType?: string;
    minSeverity?: number;
    actionType?: string;
    actorRole?: string;
    fromDate?: string;
    toDate?: string;
    userId?: string;
}

@Injectable({
    providedIn: 'root'
})
export class AnalyticsService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/Analytics`;

    getDashboardStats(): Observable<DashboardStats> {
        return this.http.get<DashboardStats>(`${this.apiUrl}/overview`).pipe(
            map(data => ({
                totalUsers: data.totalUsers,
                totalTeams: data.totalTeams,
                activeTournaments: data.activeTournaments,
                matchesToday: data.matchesToday,
                totalGoals: data.totalGoals,
                loginsToday: data.loginsToday
            }))
        );
    }

    getTeamStats(teamId: string): Observable<TeamStats> {
        return this.http.get<TeamStats>(`${this.apiUrl}/overview`, { params: { teamId } });
    }

    getRecentActivities(params?: ActivityFilterParams): Observable<PagedResult<Activity>> {
        let httpParams = new HttpParams();
        if (params?.page) httpParams = httpParams.set('page', params.page.toString());
        if (params?.pageSize) httpParams = httpParams.set('pageSize', params.pageSize.toString());
        if (params?.entityType) httpParams = httpParams.set('entityType', params.entityType);
        if (params?.minSeverity !== undefined && params?.minSeverity !== null)
            httpParams = httpParams.set('minSeverity', params.minSeverity.toString());
        if (params?.actionType) httpParams = httpParams.set('actionType', params.actionType);
        if (params?.actorRole) httpParams = httpParams.set('actorRole', params.actorRole);
        if (params?.fromDate) httpParams = httpParams.set('fromDate', params.fromDate);
        if (params?.toDate) httpParams = httpParams.set('toDate', params.toDate);
        if (params?.userId) httpParams = httpParams.set('userId', params.userId);

        return this.http.get<PagedResult<Activity>>(`${this.apiUrl}/activities`, { params: httpParams }).pipe(
            map(paged => ({
                ...paged,
                items: (paged.items || []).map(item => ({
                    ...item,
                    message: this.cleanMessage(item.message || ''),
                    timestamp: item.timestamp ? new Date(item.timestamp) : undefined
                }))
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
