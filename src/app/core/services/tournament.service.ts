import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Tournament, TeamRegistration, TournamentStanding, GenerateMatchesResponse, PendingPaymentResponse, Group, BracketDto } from '../models/tournament.model';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class TournamentService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/tournaments`;




    getTournaments(): Observable<Tournament[]> {
        return this.http.get<Tournament[]>(this.apiUrl);
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
        return this.http.get<PendingPaymentResponse[]>(`${this.apiUrl}/payments/pending`);
    }

    getAllPaymentRequests(): Observable<PendingPaymentResponse[]> {
        // Controller: GET payments/all - returns pending, approved, and rejected
        return this.http.get<PendingPaymentResponse[]>(`${this.apiUrl}/payments/all`);
    }

    getRegistrations(tournamentId: string): Observable<TeamRegistration[]> {
        return this.http.get<TeamRegistration[]>(`${this.apiUrl}/${tournamentId}/registrations`);
    }

    generateMatches(tournamentId: string): Observable<GenerateMatchesResponse> {
        return this.http.post<GenerateMatchesResponse>(`${this.apiUrl}/${tournamentId}/matches/generate`, {});
    }

    setOpeningMatch(tournamentId: string, homeTeamId: string, awayTeamId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/${tournamentId}/opening-match`, { homeTeamId, awayTeamId });
    }

    manualDraw(tournamentId: string, request: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/${tournamentId}/manual-draw`, request);
    }

    getStandings(tournamentId: string, groupId?: number): Observable<TournamentStanding[]> {
        const params: any = {};
        if (groupId) params.groupId = groupId;
        return this.http.get<TournamentStanding[]>(`${this.apiUrl}/${tournamentId}/standings`, { params });
    }

    getGroups(tournamentId: string): Observable<Group[]> {
        return this.http.get<Group[]>(`${this.apiUrl}/${tournamentId}/groups`);
    }

    getBracket(tournamentId: string): Observable<BracketDto> {
        return this.http.get<BracketDto>(`${this.apiUrl}/${tournamentId}/bracket`);
    }

    // Helper methods (mock replacement)
    getTeamActiveTournament(): Observable<Tournament | null> {
        // This logic usually requires a specific endpoint "active-tournament-for-team".
        // Or client filters all tournaments.
        // For now, assume generic fetch and filter locally or return null if not easy.
        // Or better, let component handle it. I'll implementation generic logic for MVP.
        return this.getTournaments().pipe(
            map(() => {
                // This is heavy, but MVP acceptable. ideally backend provides this.
                // Or we fetch registrations for each? No.
                // Skipping for now, returning null to force manual check or implement later.
                return null;
            })
        );
    }

    getTeamRegistration(tournamentId: string, teamId: string): Observable<TeamRegistration | null> {
        // Fetch all registrations for tournament and find team?
        // Or get specific? Backend might not expose get-single-reg.
        // Controller exposes: GET {id}/registrations (Admin only).
        // If regular user needs this, backend needs "my-registration" endpoint.
        // Assuming Admin for management views, or Captain view?
        // Let's use getRegistrations if user is admin, otherwise this is tricky.
        // I will implement fetching registrations and finding.
        return this.getRegistrations(tournamentId).pipe(
            map(regs => regs.find(r => r.teamId === teamId) || null),
            catchError(() => of(null)) // if 403 or fail
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
        return this.http.post<Tournament>(`${this.apiUrl}/${tournamentId}/emergency/start`, {});
    }

    emergencyEnd(tournamentId: string): Observable<Tournament> {
        return this.http.post<Tournament>(`${this.apiUrl}/${tournamentId}/emergency/end`, {});
    }
}

