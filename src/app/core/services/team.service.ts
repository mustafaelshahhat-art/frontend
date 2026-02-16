import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Team, Player, JoinRequest, ApiTeamMatch, ApiTeamFinance } from '../models/team.model';
import { User } from '../models/user.model';
import { PagedResult } from '../models/pagination.model';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class TeamService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/teams`;

    getTeamByCaptainId(captainId: string): Observable<Team | undefined> {
        const params = new HttpParams().set('captainId', captainId);
        return this.http.get<PagedResult<Team>>(this.apiUrl, { params }).pipe(
            map(paged => paged.items && paged.items.length > 0 ? paged.items[0] : undefined),
            catchError(() => of(undefined))
        );
    }

    getTeamByPlayerId(playerId: string): Observable<Team | undefined> {
        const params = new HttpParams().set('playerId', playerId);
        return this.http.get<PagedResult<Team>>(this.apiUrl, { params }).pipe(
            map(paged => paged.items && paged.items.length > 0 ? paged.items[0] : undefined),
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

    getAllTeams(pageNumber = 1, pageSize = 20): Observable<PagedResult<Team>> {
        const params = new HttpParams()
            .set('pageNumber', pageNumber.toString())
            .set('pageSize', pageSize.toString());
        return this.http.get<PagedResult<Team>>(this.apiUrl, { params });
    }

    createTeam(user: User, teamName: string): Observable<{ team: Team, updatedUser: User }> {
        // Backend returns TeamDto.
        // Helper to mimic signature:
        // We know user becomes Captain.
        return this.http.post<Team>(`${this.apiUrl}`, { name: teamName, city: user.cityName || 'Unknown', founded: new Date().getFullYear().toString(), logo: '' }).pipe(
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

    getTeamRequests(teamId: string): Observable<JoinRequest[]> {
        return this.http.get<PagedResult<JoinRequest>>(`${this.apiUrl}/${teamId}/requests`).pipe(
            map(paged => paged.items)
        );
    }

    invitePlayerByDisplayId(teamId: string, displayId: string): Observable<{ playerName: string }> {
        return this.http.post<{ playerName: string }>(`${this.apiUrl}/${teamId}/invite`, { displayId });
    }

    removePlayer(teamId: string, playerId: string): Observable<{ teamRemoved: boolean, playerId: string, teamId: string }> {
        return this.http.delete<{ teamRemoved: boolean, playerId: string, teamId: string }>(`${this.apiUrl}/${teamId}/players/${playerId}`);
    }

    addGuestPlayer(teamId: string, name: string, number?: number, position?: string): Observable<Player> {
        return this.http.post<Player>(`${this.apiUrl}/${teamId}/add-guest-player`, { name, number, position });
    }

    updateTeam(updatedTeam: Partial<Team>): Observable<Team> {
        return this.http.patch<Team>(`${this.apiUrl}/${updatedTeam.id}`, updatedTeam);
    }

    getTeamPlayers(teamId: string): Observable<Player[]> {
        return this.http.get<PagedResult<Player>>(`${this.apiUrl}/${teamId}/players`).pipe(
            map(paged => paged.items)
        );
    }

    getTeamMatches(teamId: string): Observable<ApiTeamMatch[]> {
        return this.http.get<PagedResult<ApiTeamMatch>>(`${this.apiUrl}/${teamId}/matches`).pipe(
            map(paged => paged.items)
        );
    }

    getTeamFinancials(teamId: string): Observable<ApiTeamFinance[]> {
        return this.http.get<PagedResult<ApiTeamFinance>>(`${this.apiUrl}/${teamId}/financials`).pipe(
            map(paged => paged.items)
        );
    }

    disableTeam(teamId: string): Observable<unknown> {
        return this.http.post<unknown>(`${this.apiUrl}/${teamId}/disable`, {});
    }

    activateTeam(teamId: string): Observable<unknown> {
        return this.http.post<unknown>(`${this.apiUrl}/${teamId}/activate`, {});
    }

    getTeamsOverview(): Observable<{ ownedTeams: Team[]; memberTeams: Team[]; pendingInvitations: any[] }> {
        return this.http.get<{ ownedTeams: Team[]; memberTeams: Team[]; pendingInvitations: any[] }>(`${environment.apiUrl}/me/teams-overview`);
    }
}

