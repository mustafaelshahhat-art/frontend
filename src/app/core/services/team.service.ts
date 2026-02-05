import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { Team, Player, JoinRequest } from '../models/team.model';
import { User } from '../models/user.model';

@Injectable({
    providedIn: 'root'
})
export class TeamService {
    private readonly http = inject(HttpClient);
    // TODO: Define actual API base URL
    private readonly apiUrl = 'api/teams';

    constructor() { }

    getTeamByCaptainId(captainId: string): Observable<Team | undefined> {
        // TODO: Implement backend endpoint
        // return this.http.get<Team>(`${this.apiUrl}/captain/${captainId}`);
        return throwError(() => new Error('Endpoint not implemented'));
    }

    getTeamByPlayerId(playerId: string): Observable<Team | undefined> {
        // TODO: Implement backend endpoint
        // return this.http.get<Team>(`${this.apiUrl}/player/${playerId}`);
        return throwError(() => new Error('Endpoint not implemented'));
    }

    getTeamById(teamId: string): Observable<Team | undefined> {
        // TODO: Implement backend endpoint
        // return this.http.get<Team>(`${this.apiUrl}/${teamId}`);
        return throwError(() => new Error('Endpoint not implemented'));
    }

    getAllTeams(): Observable<Team[]> {
        // TODO: Implement backend endpoint
        // return this.http.get<Team[]>(this.apiUrl);
        return throwError(() => new Error('Endpoint not implemented'));
    }

    createTeam(user: User, teamName: string): Observable<{ team: Team, updatedUser: User }> {
        // TODO: Implement backend endpoint
        // return this.http.post<{team: Team, updatedUser: User}>(`${this.apiUrl}`, { name: teamName });
        return throwError(() => new Error('Endpoint not implemented'));
    }

    deleteTeam(teamId: string, user: User): Observable<User> {
        // TODO: Implement backend endpoint
        // return this.http.delete<User>(`${this.apiUrl}/${teamId}`);
        return throwError(() => new Error('Endpoint not implemented'));
    }

    requestToJoinTeam(teamId: string, user: User): Observable<JoinRequest> {
        // TODO: Implement backend endpoint
        // return this.http.post<JoinRequest>(`${this.apiUrl}/${teamId}/join`, {});
        return throwError(() => new Error('Endpoint not implemented'));
    }

    respondToJoinRequest(teamId: string, requestId: string, approve: boolean, captain: User): Observable<{ request: JoinRequest, player?: Player }> {
        // TODO: Implement backend endpoint
        // return this.http.post<{request: JoinRequest, player?: Player}>(`${this.apiUrl}/${teamId}/requests/${requestId}`, { approve });
        return throwError(() => new Error('Endpoint not implemented'));
    }

    addPlayerByDisplayId(teamId: string, displayId: string, captain: User): Observable<Player> {
        // TODO: Implement backend endpoint
        // return this.http.post<Player>(`${this.apiUrl}/${teamId}/players`, { displayId });
        return throwError(() => new Error('Endpoint not implemented'));
    }

    removePlayer(teamId: string, playerId: string): Observable<boolean> {
        // TODO: Implement backend endpoint
        // return this.http.delete<boolean>(`${this.apiUrl}/${teamId}/players/${playerId}`);
        return throwError(() => new Error('Endpoint not implemented'));
    }

    updateTeam(updatedTeam: Partial<Team>): Observable<Team> {
        // TODO: Implement backend endpoint
        // return this.http.patch<Team>(`${this.apiUrl}/${updatedTeam.id}`, updatedTeam);
        return throwError(() => new Error('Endpoint not implemented'));
    }
}

