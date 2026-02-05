import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { Tournament, TeamRegistration } from '../models/tournament.model';

@Injectable({
    providedIn: 'root'
})
export class TournamentService {
    private readonly http = inject(HttpClient);
    // TODO: Define actual API base URL
    private readonly apiUrl = 'api/tournaments';

    constructor() { }

    getTournaments(): Observable<Tournament[]> {
        // TODO: Implement backend endpoint
        // return this.http.get<Tournament[]>(this.apiUrl);
        return throwError(() => new Error('Endpoint not implemented'));
    }

    getTournamentById(id: string): Observable<Tournament | undefined> {
        // TODO: Implement backend endpoint
        // return this.http.get<Tournament>(`${this.apiUrl}/${id}`);
        return throwError(() => new Error('Endpoint not implemented'));
    }

    createTournament(tournament: Omit<Tournament, 'id' | 'createdAt' | 'updatedAt'>): Observable<Tournament> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    updateTournament(id: string, updates: Partial<Tournament>): Observable<Tournament> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    deleteTournament(id: string): Observable<boolean> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    /**
     * Request to join a tournament
     */
    requestTournamentRegistration(tournamentId: string, teamId: string, teamName: string, captainId: string, captainName: string): Observable<TeamRegistration> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    /**
     * Submit payment receipt
     */
    submitPaymentReceipt(tournamentId: string, teamId: string, receiptUrl: string): Observable<TeamRegistration> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    /**
     * Admin approves payment
     */
    approvePayment(tournamentId: string, teamId: string, adminId: string): Observable<TeamRegistration> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    /**
     * Admin rejects payment
     */
    rejectPayment(tournamentId: string, teamId: string, adminId: string, reason: string): Observable<TeamRegistration> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    /**
     * Get all pending payment approvals for admin
     */
    getPendingPaymentApprovals(): Observable<{ tournament: Tournament, registration: TeamRegistration }[]> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    /**
     * Gets the tournament a team is currently registered/pending in (if any).
     */
    getTeamActiveTournament(teamId: string): Observable<Tournament | null> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    /**
     * Get team's registration in a tournament
     */
    getTeamRegistration(tournamentId: string, teamId: string): Observable<TeamRegistration | null> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    /**
     * Alias for component usage
     */
    registerTeam(tournamentId: string, teamId: string, receiptUrl: string): Observable<TeamRegistration> {
        // TODO: Implement backend endpoint
        // return this.http.post<TeamRegistration>(`${this.apiUrl}/${tournamentId}/register`, { teamId, receiptUrl });
        return throwError(() => new Error('Endpoint not implemented'));
    }
}

