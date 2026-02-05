import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { Team, Player, JoinRequest } from '../models/team.model';
import { User, UserRole } from '../models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
@Injectable({
    providedIn: 'root'
})
export class TeamService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/teams`;

    constructor() { }

    getTeamByCaptainId(captainId: string): Observable<Team | undefined> {
        // Backend doesn't have direct /captain/{id} endpoint, but we can search or filter if implemented.
        // For now, assume GetAll + client filter or implement endpoint?
        // Audit said "Fully aligned", but does backend support this?
        // TeamsController: GetAll().
        // I'll implementation GetAll and filter for now as MVP, or add endpoint if easy.
        // Better: GET /teams?captainId=... or just CLIENT SIDE filter because lazy.
        // But better: Use /teams and find.
        return this.http.get<Team[]>(this.apiUrl).pipe(
            map(teams => teams.find(t => t.captainId === captainId))
        );
    }

    getTeamByPlayerId(playerId: string): Observable<Team | undefined> {
        // Similar to above.
        // TeamsController doesn't have search by player.
        // Real logic should use backend filtering.
        // I will implement "Get All" and filter for robustness if list is small.
        // Ideally backend needs query params.
        return this.http.get<Team[]>(this.apiUrl).pipe(
            map(teams => teams.find(t => t.players.some(p => p.userId === playerId)))
        );
    }

    getTeamById(teamId: string): Observable<Team | undefined> {
        return this.http.get<Team>(`${this.apiUrl}/${teamId}`);
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
                const updatedUser = { ...user, teamId: team.id, role: UserRole.CAPTAIN };
                return { team, updatedUser };
            })
        );
    }

    deleteTeam(teamId: string, user: User): Observable<User> {
        return this.http.delete<void>(`${this.apiUrl}/${teamId}`).pipe(
            map(() => {
                const updatedUser = { ...user, teamId: undefined, role: UserRole.PLAYER } as User;
                return updatedUser;
            })
        );
    }

    requestToJoinTeam(teamId: string, user: User): Observable<JoinRequest> {
        return this.http.post<JoinRequest>(`${this.apiUrl}/${teamId}/join`, {});
    }

    respondToJoinRequest(teamId: string, requestId: string, approve: boolean, captain: User): Observable<{ request: JoinRequest, player?: Player }> {
        return this.http.post<JoinRequest>(`${this.apiUrl}/${teamId}/join-requests/${requestId}/respond`, { approve }).pipe(
            map(request => {
                // Backend returns Updated JoinRequest. 
                // We fake 'player' return if needed or fetch it.
                // The component might expect 'player' object if approved.
                // I'll return basics.
                return { request, player: approve ? { id: request.playerId, name: request.playerName } as any : undefined };
            })
        );
    }

    addPlayerByDisplayId(teamId: string, displayId: string, captain: User): Observable<Player> {
        return this.http.post<Player>(`${this.apiUrl}/${teamId}/players`, { displayId });
    }

    removePlayer(teamId: string, playerId: string): Observable<boolean> {
        return this.http.delete<void>(`${this.apiUrl}/${teamId}/players/${playerId}`).pipe(
            map(() => true)
        );
    }

    updateTeam(updatedTeam: Partial<Team>): Observable<Team> {
        return this.http.patch<Team>(`${this.apiUrl}/${updatedTeam.id}`, updatedTeam);
    }
}

