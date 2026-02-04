import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { Tournament, TournamentStatus, TeamRegistration, RegistrationStatus } from '../models/tournament.model';

@Injectable({
    providedIn: 'root'
})
export class TournamentService {
    private mockTournaments: Tournament[] = [
        {
            id: '1',
            name: 'بطولة رمضان الكبرى 2024',
            description: 'بطولة كرة القدم السنوية لشهر رمضان',
            startDate: new Date('2024-03-15'),
            endDate: new Date('2024-04-10'),
            registrationDeadline: new Date('2024-03-10'),
            maxTeams: 16,
            currentTeams: 2,
            registrations: [
                { teamId: 't1', teamName: 'الأهلي', captainId: 'u1', captainName: 'أحمد', status: RegistrationStatus.APPROVED, registeredAt: new Date() },
                { teamId: 't2', teamName: 'الاتحاد', captainId: 'u2', captainName: 'محمد', status: RegistrationStatus.APPROVED, registeredAt: new Date() }
            ],
            status: TournamentStatus.ACTIVE,
            location: 'الرياض، استاد الملك فهد',
            entryFee: 1500,
            rules: 'قوانين البطولة...',
            prizes: ['50,000 ريال', '30,000 ريال', '20,000 ريال'],
            adminId: 'admin-1',
            createdAt: new Date('2024-01-15'),
            updatedAt: new Date('2024-03-01')
        },
        {
            id: '2',
            name: 'بطولة الشباب 2024',
            description: 'بطولة للفئات العمرية تحت 18 سنة',
            startDate: new Date('2024-04-15'),
            endDate: new Date('2024-05-10'),
            registrationDeadline: new Date('2024-04-10'),
            maxTeams: 8,
            currentTeams: 1,
            registrations: [
                { teamId: 't4', teamName: 'النصر', captainId: 'u4', captainName: 'خالد', status: RegistrationStatus.PENDING_APPROVAL, paymentReceiptUrl: '/uploads/receipt1.jpg', paymentDate: new Date(), registeredAt: new Date() }
            ],
            status: TournamentStatus.REGISTRATION_OPEN,
            location: 'جدة، ملعب الملك عبدالله',
            entryFee: 1000,
            rules: 'قوانين البطولة...',
            prizes: ['20,000 ريال', '10,000 ريال'],
            adminId: 'admin-1',
            createdAt: new Date('2024-02-01'),
            updatedAt: new Date('2024-02-15')
        }
    ];

    constructor(private http: HttpClient) { }

    getTournaments(): Observable<Tournament[]> {
        return of(this.mockTournaments);
    }

    getTournamentById(id: string): Observable<Tournament | undefined> {
        const tournament = this.mockTournaments.find(t => t.id === id);
        return of(tournament);
    }

    createTournament(tournament: Omit<Tournament, 'id' | 'createdAt' | 'updatedAt'>): Observable<Tournament> {
        const newTournament: Tournament = {
            ...tournament,
            id: Date.now().toString(),
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.mockTournaments.push(newTournament);
        return of(newTournament);
    }

    updateTournament(id: string, updates: Partial<Tournament>): Observable<Tournament> {
        const index = this.mockTournaments.findIndex(t => t.id === id);
        if (index !== -1) {
            this.mockTournaments[index] = {
                ...this.mockTournaments[index],
                ...updates,
                updatedAt: new Date()
            };
            return of(this.mockTournaments[index]);
        }
        throw new Error('Tournament not found');
    }

    deleteTournament(id: string): Observable<boolean> {
        const index = this.mockTournaments.findIndex(t => t.id === id);
        if (index !== -1) {
            this.mockTournaments.splice(index, 1);
            return of(true);
        }
        return of(false);
    }

    /**
     * Step 1: Captain requests to join a tournament (creates pending registration)
     */
    requestTournamentRegistration(tournamentId: string, teamId: string, teamName: string, captainId: string, captainName: string): Observable<TeamRegistration> {
        const tournament = this.mockTournaments.find(t => t.id === tournamentId);
        if (!tournament) {
            return throwError(() => new Error('البطولة غير موجودة'));
        }

        if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
            return throwError(() => new Error('التسجيل في هذه البطولة غير متاح حالياً'));
        }

        // Check if team already has a registration (any status)
        const existingReg = tournament.registrations.find(r => r.teamId === teamId);
        if (existingReg) {
            return throwError(() => new Error('فريقك لديه طلب تسجيل بالفعل في هذه البطولة'));
        }

        // Check if team is registered/pending in another active tournament
        const conflictingTournament = this.mockTournaments.find(t =>
            t.id !== tournamentId &&
            (t.status === TournamentStatus.REGISTRATION_OPEN || t.status === TournamentStatus.ACTIVE) &&
            t.registrations.some(r => r.teamId === teamId && r.status !== RegistrationStatus.REJECTED)
        );

        if (conflictingTournament) {
            return throwError(() => new Error(`فريقك مسجل بالفعل في بطولة "${conflictingTournament.name}". لا يمكن الاشتراك في أكثر من بطولة في نفس الوقت`));
        }

        const newRegistration: TeamRegistration = {
            teamId,
            teamName,
            captainId,
            captainName,
            status: RegistrationStatus.PENDING_PAYMENT,
            registeredAt: new Date()
        };

        tournament.registrations.push(newRegistration);
        tournament.updatedAt = new Date();

        return of(newRegistration);
    }

    /**
     * Step 2: Captain submits payment receipt
     */
    submitPaymentReceipt(tournamentId: string, teamId: string, receiptUrl: string): Observable<TeamRegistration> {
        const tournament = this.mockTournaments.find(t => t.id === tournamentId);
        if (!tournament) {
            return throwError(() => new Error('البطولة غير موجودة'));
        }

        const registration = tournament.registrations.find(r => r.teamId === teamId);
        if (!registration) {
            return throwError(() => new Error('لم يتم العثور على طلب التسجيل'));
        }

        if (registration.status !== RegistrationStatus.PENDING_PAYMENT) {
            return throwError(() => new Error('لا يمكن تحديث الدفع في الوقت الحالي'));
        }

        registration.paymentReceiptUrl = receiptUrl;
        registration.paymentDate = new Date();
        registration.status = RegistrationStatus.PENDING_APPROVAL;
        tournament.updatedAt = new Date();

        return of(registration);
    }

    /**
     * Step 3: Admin approves payment
     */
    approvePayment(tournamentId: string, teamId: string, adminId: string): Observable<TeamRegistration> {
        const tournament = this.mockTournaments.find(t => t.id === tournamentId);
        if (!tournament) {
            return throwError(() => new Error('البطولة غير موجودة'));
        }

        const registration = tournament.registrations.find(r => r.teamId === teamId);
        if (!registration) {
            return throwError(() => new Error('لم يتم العثور على طلب التسجيل'));
        }

        if (registration.status !== RegistrationStatus.PENDING_APPROVAL) {
            return throwError(() => new Error('هذا الطلب غير معلق للموافقة'));
        }

        // Check if tournament is full
        const approvedCount = tournament.registrations.filter(r => r.status === RegistrationStatus.APPROVED).length;
        if (approvedCount >= tournament.maxTeams) {
            return throwError(() => new Error('البطولة مكتملة. لا يمكن قبول المزيد من الفرق'));
        }

        registration.status = RegistrationStatus.APPROVED;
        registration.approvedBy = adminId;
        registration.approvalDate = new Date();
        tournament.currentTeams = tournament.registrations.filter(r => r.status === RegistrationStatus.APPROVED).length;
        tournament.updatedAt = new Date();

        return of(registration);
    }

    /**
     * Step 3 (alt): Admin rejects payment
     */
    rejectPayment(tournamentId: string, teamId: string, adminId: string, reason: string): Observable<TeamRegistration> {
        const tournament = this.mockTournaments.find(t => t.id === tournamentId);
        if (!tournament) {
            return throwError(() => new Error('البطولة غير موجودة'));
        }

        const registration = tournament.registrations.find(r => r.teamId === teamId);
        if (!registration) {
            return throwError(() => new Error('لم يتم العثور على طلب التسجيل'));
        }

        if (registration.status !== RegistrationStatus.PENDING_APPROVAL) {
            return throwError(() => new Error('هذا الطلب غير معلق للموافقة'));
        }

        registration.status = RegistrationStatus.REJECTED;
        registration.approvedBy = adminId;
        registration.approvalDate = new Date();
        registration.rejectionReason = reason;
        tournament.updatedAt = new Date();

        return of(registration);
    }

    /**
     * Get all pending payment approvals for admin
     */
    getPendingPaymentApprovals(): Observable<{ tournament: Tournament, registration: TeamRegistration }[]> {
        const pending: { tournament: Tournament, registration: TeamRegistration }[] = [];

        for (const tournament of this.mockTournaments) {
            for (const reg of tournament.registrations) {
                if (reg.status === RegistrationStatus.PENDING_APPROVAL) {
                    pending.push({ tournament, registration: reg });
                }
            }
        }

        return of(pending);
    }

    /**
     * Gets the tournament a team is currently registered/pending in (if any).
     */
    getTeamActiveTournament(teamId: string): Observable<Tournament | null> {
        const activeTournament = this.mockTournaments.find(t =>
            (t.status === TournamentStatus.REGISTRATION_OPEN || t.status === TournamentStatus.ACTIVE) &&
            t.registrations.some(r => r.teamId === teamId && r.status !== RegistrationStatus.REJECTED)
        );
        return of(activeTournament || null);
    }

    /**
     * Get team's registration in a tournament
     */
    getTeamRegistration(tournamentId: string, teamId: string): Observable<TeamRegistration | null> {
        const tournament = this.mockTournaments.find(t => t.id === tournamentId);
        if (!tournament) return of(null);
        const reg = tournament.registrations.find(r => r.teamId === teamId);
        return of(reg || null);
    }
}
