import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Team, Player, JoinRequest, ApiTeamMatch, ApiTeamFinance } from '../models/team.model';
import { User } from '../models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class TeamService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/teams`;

    getTeamByCaptainId(captainId: string): Observable<Team | undefined> {
        return this.http.get<Team[]>(this.apiUrl, { params: { captainId } }).pipe(
            map(teams => teams && teams.length > 0 ? teams[0] : undefined),
            catchError(() => of(undefined))
        );
    }

    getTeamByPlayerId(playerId: string): Observable<Team | undefined> {
        return this.http.get<Team[]>(this.apiUrl, { params: { playerId } }).pipe(
            map(teams => teams && teams.length > 0 ? teams[0] : undefined),
            catchError(() => of(undefined))
        );
    }

    getTeamById(teamId: string): Observable<Team | undefined> {
        return this.http.get<Team>(`${this.apiUrl}/${teamId}`);
    }

    /**
     * Get team by ID, but return null if not found (404) instead of throwing.
     * Useful for pages where a deleted team should gracefully show "no team" state.
     */
    getTeamByIdSilent(teamId: string): Observable<Team | null> {
        // We use a custom header to tell our ErrorInterceptor to skip this request
        return this.http.get<Team>(`${this.apiUrl}/${teamId}`, {
            headers: { 'X-Skip-Error-Handler': 'true' }
        }).pipe(
            catchError((err) => {
                if (err?.status === 404) {
                    return of(null);
                }
                return throwError(() => err);
            })
        );
    }

    getAllTeams(): Observable<Team[]> {
        return this.http.get<Team[]>(this.apiUrl);
    }

    createTeam(user: User, teamName: string): Observable<{ team: Team, updatedUser: User }> {
        // Backend returns TeamDto.
        // Helper to mimic signature:
        // We know user becomes Captain.
        return this.http.post<Team>(`${this.apiUrl}`, { name: teamName, city: user.city || 'Unknown', founded: new Date().getFullYear().toString(), logo: '' }).pipe(
            map(team => {
                const updatedUser = { ...user, teamId: team.id };
                return { team, updatedUser };
            })
        );
    }

    deleteTeam(teamId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${teamId}`);
    }

    requestToJoinTeam(teamId: string): Observable<JoinRequest> {
        return this.http.post<JoinRequest>(`${this.apiUrl}/${teamId}/join`, {});
    }

    respondToJoinRequest(teamId: string, requestId: string, approve: boolean): Observable<{ request: JoinRequest, player?: Player }> {
        return this.http.post<JoinRequest>(`${this.apiUrl}/${teamId}/join-requests/${requestId}/respond`, { approve }).pipe(
            map(request => {
                // Backend returns Updated JoinRequest. 
                // We fake 'player' return if needed or fetch it.
                // The component might expect 'player' object if approved.
                // I'll return basics.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-restricted-syntax
                return { request, player: approve ? { id: request.playerId, name: request.playerName } as any : undefined };
            })
        );
    }

    getTeamRequests(teamId: string): Observable<unknown[]> {
        return this.http.get<unknown[]>(`${this.apiUrl}/${teamId}/requests`);
    }

    invitePlayerByDisplayId(teamId: string, displayId: string): Observable<{ playerName: string }> {
        return this.http.post<{ playerName: string }>(`${this.apiUrl}/${teamId}/invite`, { displayId });
    }

    removePlayer(teamId: string, playerId: string): Observable<{ teamRemoved: boolean, playerId: string, teamId: string }> {
        return this.http.delete<{ teamRemoved: boolean, playerId: string, teamId: string }>(`${this.apiUrl}/${teamId}/players/${playerId}`);
    }

    updateTeam(updatedTeam: Partial<Team>): Observable<Team> {
        return this.http.patch<Team>(`${this.apiUrl}/${updatedTeam.id}`, updatedTeam);
    }

    getTeamPlayers(teamId: string): Observable<Player[]> {
        return this.http.get<Player[]>(`${this.apiUrl}/${teamId}/players`);
    }

    getTeamMatches(teamId: string): Observable<ApiTeamMatch[]> {
        return this.http.get<ApiTeamMatch[]>(`${this.apiUrl}/${teamId}/matches`);
    }

    getTeamFinancials(teamId: string): Observable<ApiTeamFinance[]> {
        return this.http.get<ApiTeamFinance[]>(`${this.apiUrl}/${teamId}/financials`);
    }

    disableTeam(teamId: string): Observable<unknown> {
        return this.http.post<unknown>(`${this.apiUrl}/${teamId}/disable`, {});
    }

    getTeamsOverview(): Observable<{ ownedTeams: Team[]; memberTeams: Team[]; pendingInvitations: any[] }> {
        return this.http.get<{ ownedTeams: Team[]; memberTeams: Team[]; pendingInvitations: any[] }>(`${environment.apiUrl}/me/teams-overview`);
    }
}

