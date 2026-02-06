import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TeamJoinRequest } from '../models/team-request.model';

@Injectable({
    providedIn: 'root'
})
export class TeamRequestService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/teamrequests`;

    getMyInvitations(): Observable<TeamJoinRequest[]> {
        return this.http.get<TeamJoinRequest[]>(`${this.apiUrl}/my-invitations`);
    }

    getRequestsForMyTeam(): Observable<TeamJoinRequest[]> {
        return this.http.get<TeamJoinRequest[]>(`${this.apiUrl}/for-my-team`);
    }

    acceptRequest(requestId: string): Observable<TeamJoinRequest> {
        return this.http.post<TeamJoinRequest>(`${this.apiUrl}/${requestId}/accept`, {});
    }

    rejectRequest(requestId: string): Observable<TeamJoinRequest> {
        return this.http.post<TeamJoinRequest>(`${this.apiUrl}/${requestId}/reject`, {});
    }

    respondToRequest(teamId: string, requestId: string, approve: boolean): Observable<TeamJoinRequest> {
        // This one is currently on TeamsController in backend, let's point there
        return this.http.post<TeamJoinRequest>(`${environment.apiUrl}/teams/${teamId}/join-requests/${requestId}/respond`, { approve });
    }
}
