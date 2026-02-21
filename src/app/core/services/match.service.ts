import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { PagedResult } from '../models/pagination.model';
import { Match, MatchStatus, Card, Goal, MatchEvent } from '../models/tournament.model';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class MatchService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/matches`;
    private readonly matchUpdatedSubject = new BehaviorSubject<Match | null>(null);

    // ── PERF: TTL-based cache (same pattern as TournamentService) ──
    // Before: every tournament detail page visit re-fetched up to 200 matches from API.
    // After: cached for 15s, preventing redundant network calls on rapid navigation.
    private readonly cache = new Map<string, { obs$: Observable<unknown>; expiry: number }>();
    private static readonly DEFAULT_TTL_MS = 15_000; // 15 seconds (shorter than tournament's 30s since matches change more frequently)

    private cachedGet<T>(key: string, factory: () => Observable<T>, ttlMs = MatchService.DEFAULT_TTL_MS): Observable<T> {
        const entry = this.cache.get(key);
        if (entry && entry.expiry > Date.now()) {
            return entry.obs$ as Observable<T>;
        }
        const obs$ = factory().pipe(shareReplay({ bufferSize: 1, refCount: true }));
        this.cache.set(key, { obs$, expiry: Date.now() + ttlMs });
        return obs$;
    }

    /** Invalidate cache entries whose key starts with `prefix`, or all entries if omitted. */
    invalidateCache(prefix?: string): void {
        if (!prefix) {
            this.cache.clear();
            return;
        }
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) this.cache.delete(key);
        }
    }

    get matchUpdated$(): Observable<Match | null> {
        return this.matchUpdatedSubject.asObservable();
    }

    emitMatchUpdate(match: Match): void {
        this.matchUpdatedSubject.next(match);
    }

    getMatches(pageNumber = 1, pageSize = 20, creatorId?: string, status?: string, teamId?: string): Observable<PagedResult<Match>> {
        // PERF-FIX: Wrap in cachedGet — previously hit network on every call.
        // The MatchesListComponent re-fetches on every page visit.
        const key = `list:${pageNumber}:${pageSize}:${creatorId ?? ''}:${status ?? ''}:${teamId ?? ''}`;
        return this.cachedGet(key, () => {
            let params = new HttpParams()
                .set('pageNumber', pageNumber.toString())
                .set('pageSize', pageSize.toString());

            if (creatorId) {
                params = params.set('creatorId', creatorId);
            }
            if (status) {
                params = params.set('status', status);
            }
            if (teamId) {
                params = params.set('teamId', teamId);
            }

            return this.http.get<PagedResult<Match>>(this.apiUrl, { params });
        });
    }



    getMatchById(id: string): Observable<Match | undefined> {
        return this.http.get<Match>(`${this.apiUrl}/${id}`);
    }

    getMatchesByTournament(tournamentId: string, pageSize = 200): Observable<Match[]> {
        return this.cachedGet(`tournament:${tournamentId}`, () => {
            const params = new HttpParams().set('pageSize', pageSize.toString()).set('page', '1');
            return this.http
                .get<PagedResult<Match>>(`${environment.apiUrl}/tournaments/${tournamentId}/matches`, { params })
                .pipe(map(result => result?.items ?? []));
        });
    }

    // PERF-FIX: Server-side filtering — eliminates fetching 100 records and filtering in browser
    getMatchesByTeam(teamId: string): Observable<Match[]> {
        return this.getMatches(1, 50, undefined, undefined, teamId).pipe(
            map(paged => paged.items)
        );
    }

    getLiveMatches(): Observable<Match[]> {
        return this.getMatches(1, 50, undefined, 'Live').pipe(
            map(paged => paged.items)
        );
    }

    getUpcomingMatches(): Observable<Match[]> {
        return this.getMatches(1, 50, undefined, 'Scheduled').pipe(
            map(paged => paged.items)
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


