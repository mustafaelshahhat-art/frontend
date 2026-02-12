import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { Match, MatchStatus, Card, Goal, MatchEvent } from '../models/tournament.model';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class MatchService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/matches`;
    private readonly matchUpdatedSubject = new BehaviorSubject<Match | null>(null);

    get matchUpdated$(): Observable<Match | null> {
        return this.matchUpdatedSubject.asObservable();
    }

    emitMatchUpdate(match: Match): void {
        this.matchUpdatedSubject.next(match);
    }

    getMatches(): Observable<Match[]> {
        return this.http.get<Match[]>(this.apiUrl);
    }



    getMatchById(id: string): Observable<Match | undefined> {
        return this.http.get<Match>(`${this.apiUrl}/${id}`);
    }

    getMatchesByTournament(tournamentId: string): Observable<Match[]> {
        // If backend does not have specific endpoint, filter locally
        return this.getMatches().pipe(
            map(matches => matches.filter(m => m.tournamentId === tournamentId))
        );
    }



    getMatchesByTeam(teamId: string): Observable<Match[]> {
        return this.getMatches().pipe(
            map(matches => matches.filter(m => m.homeTeamId === teamId || m.awayTeamId === teamId))
        );
    }

    getLiveMatches(): Observable<Match[]> {
        return this.getMatches().pipe(
            map(matches => matches.filter(m => m.status === MatchStatus.LIVE))
        );
    }

    getUpcomingMatches(): Observable<Match[]> {
        return this.getMatches().pipe(
            map(matches => matches.filter(m => m.status === MatchStatus.SCHEDULED)) // Assuming Scheduled exists
        );
    }

    updateMatch(id: string, data: Partial<Match>): Observable<Match> {
        return this.http.patch<Match>(`${this.apiUrl}/${id}`, data);
    }

    updateMatchScore(id: string, homeScore: number, awayScore: number): Observable<boolean> {
        return this.updateMatch(id, { homeScore, awayScore }).pipe(map(() => true));
    }

    updateMatchStatus(id: string, status: MatchStatus): Observable<boolean> {
        return this.http.patch<Match>(`${this.apiUrl}/${id}`, { status }).pipe(map(() => true));
    }

    addGoal(matchId: string, goal: Goal): Observable<boolean> {
        // Mapped to AddEvent
        const event = {
            type: 'Goal',
            teamId: goal.teamId,
            playerId: goal.playerId,
            minute: goal.minute
        };
        return this.http.post(`${this.apiUrl}/${matchId}/events`, event).pipe(map(() => true));
    }

    addCard(matchId: string, card: Card): Observable<boolean> {
        const event = {
            type: card.type === 'yellow' ? 'YellowCard' : 'RedCard', // Match enum strings
            teamId: card.teamId,
            playerId: card.playerId,
            minute: card.minute
        };
        return this.http.post(`${this.apiUrl}/${matchId}/events`, event).pipe(map(() => true));
    }

    startMatch(matchId: string): Observable<Match | undefined> {
        return this.http.post<Match>(`${this.apiUrl}/${matchId}/start`, {});
    }

    endMatch(matchId: string): Observable<Match | undefined> {
        return this.http.post<Match>(`${this.apiUrl}/${matchId}/end`, {});
    }

    addMatchEvent(matchId: string, event: Omit<MatchEvent, 'id' | 'matchId' | 'createdAt'>): Observable<Match | undefined> {
        // Generic add event
        return this.http.post<Match>(`${this.apiUrl}/${matchId}/events`, event);
    }

    submitMatchReport(matchId: string, notes: string): Observable<Match | undefined> {
        return this.http.post<Match>(`${this.apiUrl}/${matchId}/report`, { notes });
    }



    postponeMatch(matchId: string): Observable<boolean> {
        // Update status to 'Postponed'
        return this.updateMatchStatus(matchId, MatchStatus.POSTPONED); // Ensure enum matches
    }

    resetMatch(matchId: string): Observable<Match | undefined> {
        // Custom logic? Or update status to Scheduled?
        return this.updateMatchStatus(matchId, MatchStatus.SCHEDULED).pipe(map(() => undefined));
    }



    deleteMatchEvent(matchId: string, eventId: string): Observable<Match> {
        return this.http.delete<Match>(`${this.apiUrl}/${matchId}/events/${eventId}`);
    }
}


