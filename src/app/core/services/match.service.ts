import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { Match, MatchStatus, Card, Goal, MatchEvent, MatchReport } from '../models/tournament.model';

@Injectable({
    providedIn: 'root'
})
export class MatchService {
    private readonly http = inject(HttpClient);
    // TODO: Define actual API base URL
    private readonly apiUrl = 'api/matches';

    getMatches(): Observable<Match[]> {
        // TODO: Implement backend endpoint
        // return this.http.get<Match[]>(this.apiUrl);
        return throwError(() => new Error('Endpoint not implemented'));
    }

    getMatchById(id: string): Observable<Match | undefined> {
        // TODO: Implement backend endpoint
        // return this.http.get<Match>(`${this.apiUrl}/${id}`);
        return throwError(() => new Error('Endpoint not implemented'));
    }

    getMatchesByTournament(tournamentId: string): Observable<Match[]> {
        // TODO: Implement backend endpoint
        // return this.http.get<Match[]>(`${this.apiUrl}/tournament/${tournamentId}`);
        return throwError(() => new Error('Endpoint not implemented'));
    }

    getMatchesByReferee(refereeId: string): Observable<Match[]> {
        // TODO: Implement backend endpoint
        // return this.http.get<Match[]>(`${this.apiUrl}/referee/${refereeId}`);
        return throwError(() => new Error('Endpoint not implemented'));
    }

    getMatchesByTeam(teamId: string): Observable<Match[]> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    getLiveMatches(): Observable<Match[]> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    getUpcomingMatches(): Observable<Match[]> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    updateMatchScore(id: string, homeScore: number, awayScore: number): Observable<boolean> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    updateMatchStatus(id: string, status: MatchStatus): Observable<boolean> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    addGoal(matchId: string, goal: Goal): Observable<boolean> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    addCard(matchId: string, card: Card): Observable<boolean> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    startMatch(matchId: string): Observable<Match | undefined> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    endMatch(matchId: string): Observable<Match | undefined> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    addMatchEvent(matchId: string, event: Omit<MatchEvent, 'id' | 'matchId' | 'createdAt'>): Observable<Match | undefined> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    /**
     * Submit match report by referee
     */
    submitMatchReport(matchId: string, notes: string, refereeId: string, refereeName: string): Observable<Match | undefined> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    /**
     * Get match report
     */
    getMatchReport(matchId: string): Observable<MatchReport | null> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    postponeMatch(matchId: string): Observable<boolean> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    resetMatch(matchId: string): Observable<Match | undefined> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    assignReferee(matchId: string, refereeId: string, refereeName: string): Observable<Match | undefined> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }
}


