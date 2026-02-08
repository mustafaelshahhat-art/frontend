import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DashboardStats {
    totalUsers: number;
    totalTeams: number;
    totalReferees: number;
    activeTournaments: number;
    matchesToday: number;
    pendingObjections: number;
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
        return this.http.get<any>(`${this.apiUrl}/overview`).pipe(
            map(data => ({
                totalUsers: data.totalUsers,
                totalTeams: data.totalTeams,
                totalReferees: data.totalReferees,
                activeTournaments: data.activeTournaments,
                matchesToday: data.matchesToday,
                pendingObjections: data.pendingObjections,
                totalGoals: data.totalGoals,
                loginsToday: data.loginsToday
            }))
        );
    }

    getTeamStats(teamId: string): Observable<TeamStats> {
        return this.http.get<TeamStats>(`${this.apiUrl}/overview`, { params: { teamId } });
    }

    getRecentActivities(): Observable<Activity[]> {
        return this.http.get<any[]>(`${this.apiUrl}/activities`).pipe(
            map(data => (data || []).map(item => ({
                type: item.type || item.Type || '',
                message: this.cleanMessage(item.message || item.Message || ''),
                time: '', // Deprecated, will use pipe on timestamp
                userName: item.userName || item.UserName,
                action: item.action || item.Action,
                timestamp: new Date(item.timestamp || item.Timestamp),
                status: item.status || item.Status
            })))
        );
    }

    private cleanMessage(msg: string): string {
        if (!msg) return '';

        // Remove GUIDs/IDs like (ID: 9c7af14a-...)
        let clean = msg.replace(/\(ID: [^)]+\)/gi, '').trim();

        // Specific pattern replacements
        if (clean.toLowerCase().includes('activated by system/admin')) {
            const teamName = clean.replace(/Team/i, '').replace(/activated by system\/admin/i, '').trim();
            return `تم تفعيل فريق ${teamName || ''}`;
        }
        if (clean.toLowerCase().includes('deactivated by system/admin') || clean.toLowerCase().includes('has been disabled by admin')) {
            const teamName = clean.replace(/Team/i, '').replace(/deactivated by system\/admin/i, '').replace(/has been disabled by admin/i, '').trim();
            return `تم تعطيل فريق ${teamName || ''}`;
        }
        if (clean.toLowerCase().includes('logged in')) {
            const userName = clean.replace(/User/i, '').replace(/logged in/i, '').trim();
            if (!userName || userName.toLowerCase() === 'admin user') return 'تسجيل دخول: مدير النظام';
            return `تسجيل دخول: ${userName}`;
        }
        if (clean.toLowerCase().includes('registration closed for tournament')) {
            const tourneyName = clean.replace(/Registration closed for Tournament/i, '').trim();
            return `إغلاق التسجيل في بطولة ${tourneyName || ''}`;
        }

        return clean;
    }
}
