import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Tournament, TeamRegistration, TournamentStanding, GenerateMatchesResponse, PendingPaymentResponse, Group, BracketDto, Match } from '../models/tournament.model';
import { PagedResult } from '../models/pagination.model';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class TournamentService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/tournaments`;




    getTournaments(pageNumber = 1, pageSize = 20): Observable<PagedResult<Tournament>> {
        const params = new HttpParams()
            .set('page', pageNumber.toString())
            .set('pageSize', pageSize.toString());

        return this.http.get<PagedResult<Tournament>>(this.apiUrl, { params });
    }

    getTournamentById(id: string): Observable<Tournament | undefined> {
        return this.http.get<Tournament>(`${this.apiUrl}/${id}`);
    }

    createTournament(tournament: Omit<Tournament, 'id' | 'createdAt' | 'updatedAt'>): Observable<Tournament> {
        return this.http.post<Tournament>(this.apiUrl, tournament);
    }

    updateTournament(id: string, updates: Partial<Tournament>): Observable<Tournament> {
        return this.http.patch<Tournament>(`${this.apiUrl}/${id}`, updates);
    }

    deleteTournament(id: string): Observable<boolean> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(map(() => true));
    }

    closeRegistration(id: string): Observable<Tournament> {
        return this.http.post<Tournament>(`${this.apiUrl}/${id}/close-registration`, {});
    }

    startTournament(id: string): Observable<Tournament> {
        return this.http.post<Tournament>(`${this.apiUrl}/${id}/start`, {});
    }

    openRegistration(id: string): Observable<Tournament> {
        return this.http.patch<Tournament>(`${this.apiUrl}/${id}`, { status: 'RegistrationOpen' });
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
        return this.http.get<PagedResult<PendingPaymentResponse>>(`${this.apiUrl}/payments/pending`).pipe(
            map(paged => paged.items)
        );
    }

    getAllPaymentRequests(): Observable<PendingPaymentResponse[]> {
        // Controller: GET payments/all - returns pending, approved, and rejected
        return this.http.get<PagedResult<PendingPaymentResponse>>(`${this.apiUrl}/payments/all`).pipe(
            map(paged => paged.items)
        );
    }

    getRegistrations(tournamentId: string): Observable<TeamRegistration[]> {
        return this.http.get<PagedResult<TeamRegistration>>(`${this.apiUrl}/${tournamentId}/registrations`).pipe(
            map(paged => paged.items)
        );
    }

    generateMatches(tournamentId: string): Observable<GenerateMatchesResponse> {
        return this.http.post<GenerateMatchesResponse>(`${this.apiUrl}/${tournamentId}/generate-matches`, {});
    }

    setOpeningMatch(tournamentId: string, homeTeamId: string, awayTeamId: string): Observable<Match[]> {
        return this.http.post<Match[]>(`${this.apiUrl}/${tournamentId}/opening-match`, { homeTeamId, awayTeamId });
    }

    manualDraw(tournamentId: string, request: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/${tournamentId}/manual-draw`, request);
    }

    getStandings(tournamentId: string, groupId?: number): Observable<TournamentStanding[]> {
        const params: any = {};
        if (groupId) params.groupId = groupId;
        return this.http.get<PagedResult<TournamentStanding>>(`${this.apiUrl}/${tournamentId}/standings`, { params }).pipe(
            map(paged => paged.items)
        );
    }

    getGroups(tournamentId: string): Observable<Group[]> {
        return this.http.get<PagedResult<Group>>(`${this.apiUrl}/${tournamentId}/groups`).pipe(
            map(paged => paged.items)
        );
    }

    getBracket(tournamentId: string): Observable<BracketDto> {
        return this.http.get<BracketDto>(`${this.apiUrl}/${tournamentId}/bracket`);
    }

    assignGroups(tournamentId: string, assignments: any[]): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/${tournamentId}/assign-groups`, assignments);
    }

    generateManualGroupMatches(tournamentId: string): Observable<any[]> {
        return this.http.post<any[]>(`${this.apiUrl}/${tournamentId}/generate-manual-group-matches`, {});
    }

    createManualKnockoutMatches(tournamentId: string, pairings: any[]): Observable<any[]> {
        return this.http.post<any[]>(`${this.apiUrl}/${tournamentId}/manual-knockout-pairings`, pairings);
    }

    resetSchedule(tournamentId: string): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/${tournamentId}/reset-schedule`, {});
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
        return this.http.post<void>(`${this.apiUrl}/${tournamentId}/eliminate/${teamId}`, {});
    }

    emergencyStart(tournamentId: string): Observable<Tournament> {
        return this.http.post<Tournament>(`${this.apiUrl}/${tournamentId}/emergency-start`, {});
    }

    emergencyEnd(tournamentId: string): Observable<Tournament> {
        return this.http.post<Tournament>(`${this.apiUrl}/${tournamentId}/emergency-end`, {});
    }
}

