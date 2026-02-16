import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay, tap } from 'rxjs/operators';
import { Tournament, TeamRegistration, TournamentStanding, GenerateMatchesResponse, PendingPaymentResponse, Group, BracketDto, Match } from '../models/tournament.model';
import { PagedResult } from '../models/pagination.model';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class TournamentService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/tournaments`;

    // ── TTL-based HTTP response cache ──────────────────────────────
    private readonly cache = new Map<string, { obs$: Observable<unknown>; expiry: number }>();
    private static readonly DEFAULT_TTL_MS = 30_000; // 30 seconds

    /**
     * Returns a cached observable for the given key. If the cache entry
     * is missing or expired a new request is created via `factory`,
     * shared with `shareReplay(1)` and stored.
     */
    private cachedGet<T>(key: string, factory: () => Observable<T>, ttlMs = TournamentService.DEFAULT_TTL_MS): Observable<T> {
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

    getTournaments(pageNumber = 1, pageSize = 20): Observable<PagedResult<Tournament>> {
        const key = `list:${pageNumber}:${pageSize}`;
        return this.cachedGet(key, () => {
            const params = new HttpParams()
                .set('page', pageNumber.toString())
                .set('pageSize', pageSize.toString());
            return this.http.get<PagedResult<Tournament>>(this.apiUrl, { params });
        });
    }

    getTournamentById(id: string): Observable<Tournament | undefined> {
        return this.cachedGet(`detail:${id}`, () =>
            this.http.get<Tournament>(`${this.apiUrl}/${id}`)
        );
    }

    createTournament(tournament: Omit<Tournament, 'id' | 'createdAt' | 'updatedAt'>): Observable<Tournament> {
        return this.http.post<Tournament>(this.apiUrl, tournament).pipe(
            tap(() => this.invalidateCache('list'))
        );
    }

    updateTournament(id: string, updates: Partial<Tournament>): Observable<Tournament> {
        return this.http.patch<Tournament>(`${this.apiUrl}/${id}`, updates).pipe(
            tap(() => { this.invalidateCache('list'); this.invalidateCache(`detail:${id}`); })
        );
    }

    deleteTournament(id: string): Observable<boolean> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
            map(() => true),
            tap(() => this.invalidateCache())
        );
    }

    closeRegistration(id: string): Observable<Tournament> {
        return this.http.post<Tournament>(`${this.apiUrl}/${id}/close-registration`, {}).pipe(
            tap(() => this.invalidateCache(`detail:${id}`))
        );
    }

    startTournament(id: string): Observable<Tournament> {
        return this.http.post<Tournament>(`${this.apiUrl}/${id}/start`, {}).pipe(
            tap(() => { this.invalidateCache('list'); this.invalidateCache(`detail:${id}`); })
        );
    }

    openRegistration(id: string): Observable<Tournament> {
        return this.http.patch<Tournament>(`${this.apiUrl}/${id}`, { status: 'RegistrationOpen' }).pipe(
            tap(() => this.invalidateCache(`detail:${id}`))
        );
    }

    requestTournamentRegistration(tournamentId: string, teamId: string): Observable<TeamRegistration> {
        // According to TournamentsController: POST {id}/register
        return this.http.post<TeamRegistration>(`${this.apiUrl}/${tournamentId}/register`, { teamId });
    }

    submitPaymentReceipt(tournamentId: string, teamId: string, receipt: File, senderNumber?: string): Observable<TeamRegistration> {
        const formData = new FormData();
        formData.append('receipt', receipt);
        if (senderNumber) {
            formData.append('senderNumber', senderNumber);
        }
        return this.http.post<TeamRegistration>(`${this.apiUrl}/${tournamentId}/registrations/${teamId}/payment`, formData);
    }

    approveRegistration(tournamentId: string, teamId: string): Observable<TeamRegistration> {
        return this.http.post<TeamRegistration>(`${this.apiUrl}/${tournamentId}/registrations/${teamId}/approve`, {});
    }

    rejectRegistration(tournamentId: string, teamId: string, reason: string): Observable<TeamRegistration> {
        return this.http.post<TeamRegistration>(`${this.apiUrl}/${tournamentId}/registrations/${teamId}/reject`, { reason });
    }

    approvePayment(tournamentId: string, teamId: string): Observable<TeamRegistration> {
        return this.approveRegistration(tournamentId, teamId);
    }

    rejectPayment(tournamentId: string, teamId: string, reason: string): Observable<TeamRegistration> {
        return this.rejectRegistration(tournamentId, teamId, reason);
    }

    promoteWaitingTeam(tournamentId: string, teamId: string): Observable<TeamRegistration> {
        return this.http.post<TeamRegistration>(`${this.apiUrl}/${tournamentId}/registrations/${teamId}/promote`, {});
    }

    withdrawTeam(tournamentId: string, teamId: string): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/${tournamentId}/registrations/${teamId}/withdraw`, {});
    }

    getPendingPaymentApprovals(): Observable<PendingPaymentResponse[]> {
        // Controller: GET payments/pending
        return this.http.get<PagedResult<PendingPaymentResponse>>(`${this.apiUrl}/payments/pending`, {
            params: new HttpParams().set('pageSize', '200')
        }).pipe(
            map(paged => paged.items)
        );
    }

    getAllPaymentRequests(): Observable<PendingPaymentResponse[]> {
        // Controller: GET payments/all - returns pending, approved, and rejected
        return this.http.get<PagedResult<PendingPaymentResponse>>(`${this.apiUrl}/payments/all`, {
            params: new HttpParams().set('pageSize', '200')
        }).pipe(
            map(paged => paged.items)
        );
    }

    getRegistrations(tournamentId: string): Observable<TeamRegistration[]> {
        return this.http.get<PagedResult<TeamRegistration>>(`${this.apiUrl}/${tournamentId}/registrations`, {
            params: new HttpParams().set('pageSize', '200')
        }).pipe(
            map(paged => paged.items)
        );
    }

    generateMatches(tournamentId: string): Observable<GenerateMatchesResponse> {
        return this.http.post<GenerateMatchesResponse>(`${this.apiUrl}/${tournamentId}/generate-matches`, {}).pipe(
            tap(() => { this.invalidateCache(`standings:${tournamentId}`); this.invalidateCache(`bracket:${tournamentId}`); this.invalidateCache(`groups:${tournamentId}`); })
        );
    }

    setOpeningMatch(tournamentId: string, homeTeamId: string, awayTeamId: string): Observable<Match[]> {
        return this.http.post<Match[]>(`${this.apiUrl}/${tournamentId}/opening-match`, { homeTeamId, awayTeamId });
    }

    manualDraw(tournamentId: string, request: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/${tournamentId}/manual-draw`, request);
    }

    getStandings(tournamentId: string, groupId?: number): Observable<TournamentStanding[]> {
        const key = `standings:${tournamentId}:${groupId ?? 'all'}`;
        return this.cachedGet(key, () => {
            const params: any = {};
            if (groupId) params.groupId = groupId;
            return this.http.get<PagedResult<TournamentStanding>>(`${this.apiUrl}/${tournamentId}/standings`, { params }).pipe(
                map(paged => paged.items)
            );
        });
    }

    getGroups(tournamentId: string): Observable<Group[]> {
        return this.cachedGet(`groups:${tournamentId}`, () =>
            this.http.get<PagedResult<Group>>(`${this.apiUrl}/${tournamentId}/groups`).pipe(
                map(paged => paged.items)
            )
        );
    }

    getBracket(tournamentId: string): Observable<BracketDto> {
        return this.cachedGet(`bracket:${tournamentId}`, () =>
            this.http.get<BracketDto>(`${this.apiUrl}/${tournamentId}/bracket`)
        );
    }

    assignGroups(tournamentId: string, assignments: any[]): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/${tournamentId}/assign-groups`, assignments).pipe(
            tap(() => { this.invalidateCache(`groups:${tournamentId}`); this.invalidateCache(`standings:${tournamentId}`); })
        );
    }

    generateManualGroupMatches(tournamentId: string): Observable<any[]> {
        return this.http.post<any[]>(`${this.apiUrl}/${tournamentId}/generate-manual-group-matches`, {}).pipe(
            tap(() => this.invalidateCache(`standings:${tournamentId}`))
        );
    }

    createManualKnockoutMatches(tournamentId: string, pairings: any[]): Observable<any[]> {
        return this.http.post<any[]>(`${this.apiUrl}/${tournamentId}/manual-knockout-pairings`, pairings).pipe(
            tap(() => this.invalidateCache(`bracket:${tournamentId}`))
        );
    }

    resetSchedule(tournamentId: string): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/${tournamentId}/reset-schedule`, {}).pipe(
            tap(() => { this.invalidateCache(`standings:${tournamentId}`); this.invalidateCache(`groups:${tournamentId}`); this.invalidateCache(`bracket:${tournamentId}`); })
        );
    }

    // Helper methods (mock replacement)
    getTeamActiveTournament(teamId: string): Observable<Tournament | null> {
        return this.http.get<Tournament>(`${this.apiUrl}/active/team/${teamId}`).pipe(
            catchError(() => of(null))
        );
    }

    getTeamRegistration(tournamentId: string, teamId: string): Observable<TeamRegistration | null> {
        return this.http.get<TeamRegistration>(`${this.apiUrl}/${tournamentId}/registration/team/${teamId}`).pipe(
            catchError(() => of(null))
        );
    }

    registerTeam(tournamentId: string, teamId: string): Observable<TeamRegistration> {
        // Two step: Register then Payment? Or just Register (which is PendingPayment)?
        // Backend 'RegisterTeam' sets status to PendingPayment.
        // 'SubmitPayment' sets ReceiptUrl.
        // So this aliases requestTournamentRegistration.
        return this.requestTournamentRegistration(tournamentId, teamId);
    }

    eliminateTeam(tournamentId: string, teamId: string): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/${tournamentId}/eliminate/${teamId}`, {}).pipe(
            tap(() => { this.invalidateCache(`standings:${tournamentId}`); this.invalidateCache(`bracket:${tournamentId}`); })
        );
    }

    emergencyStart(tournamentId: string): Observable<Tournament> {
        return this.http.post<Tournament>(`${this.apiUrl}/${tournamentId}/emergency-start`, {});
    }

    emergencyEnd(tournamentId: string): Observable<Tournament> {
        return this.http.post<Tournament>(`${this.apiUrl}/${tournamentId}/emergency-end`, {});
    }
}

