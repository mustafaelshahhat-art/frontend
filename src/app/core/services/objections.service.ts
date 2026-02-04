import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface Objection {
    id: string;
    tournamentId: string;
    tournamentName: string;
    matchId: string;
    teamId: string;
    teamName: string;
    captainId: string;
    captainName: string;
    type: ObjectionType;
    description: string;
    evidence?: string[];
    status: ObjectionStatus;
    submittedDate: Date;
    reviewedDate?: Date;
    reviewedBy?: string;
    adminNotes?: string;
}

export enum ObjectionType {
    MATCH_RESULT = 'match_result',
    REFEREE_DECISION = 'referee_decision',
    PLAYER_ELIGIBILITY = 'player_eligibility',
    RULE_VIOLATION = 'rule_violation',
    OTHER = 'other'
}

export enum ObjectionStatus {
    PENDING = 'pending',
    UNDER_REVIEW = 'under_review',
    APPROVED = 'approved',
    REJECTED = 'rejected'
}

@Injectable({
    providedIn: 'root'
})
export class ObjectionsService {
    private mockObjections: Objection[] = [
        {
            id: 'obj1', tournamentId: 't1', tournamentName: 'بطولة رمضان 2024',
            matchId: 'm1', teamId: 'team1', teamName: 'النجوم',
            captainId: 'c1', captainName: 'أحمد محمد',
            type: ObjectionType.MATCH_RESULT,
            description: 'اعتراض على نتيجة المباراة - هدف غير محتسب',
            status: ObjectionStatus.PENDING,
            submittedDate: new Date('2024-03-20')
        },
        {
            id: 'obj2', tournamentId: 't1', tournamentName: 'بطولة رمضان 2024',
            matchId: 'm2', teamId: 'team2', teamName: 'الصقور',
            captainId: 'c2', captainName: 'خالد سعد',
            type: ObjectionType.REFEREE_DECISION,
            description: 'اعتراض على بطاقة حمراء غير مستحقة',
            status: ObjectionStatus.APPROVED,
            submittedDate: new Date('2024-03-18'),
            reviewedDate: new Date('2024-03-19'),
            reviewedBy: 'admin',
            adminNotes: 'تم التحقق وقبول الاعتراض'
        }
    ];

    getObjections(): Observable<Objection[]> {
        return of(this.mockObjections);
    }

    getObjectionById(id: string): Observable<Objection | undefined> {
        return of(this.mockObjections.find(o => o.id === id));
    }

    getObjectionsByTeam(teamId: string): Observable<Objection[]> {
        return of(this.mockObjections.filter(o => o.teamId === teamId));
    }

    getObjectionsByStatus(status: ObjectionStatus): Observable<Objection[]> {
        return of(this.mockObjections.filter(o => o.status === status));
    }

    submitObjection(objection: Partial<Objection>): Observable<Objection> {
        const newObjection: Objection = {
            id: `obj-${Date.now()}`,
            tournamentId: objection.tournamentId || '',
            tournamentName: objection.tournamentName || '',
            matchId: objection.matchId || '',
            teamId: objection.teamId || '',
            teamName: objection.teamName || '',
            captainId: objection.captainId || '',
            captainName: objection.captainName || '',
            type: objection.type || ObjectionType.OTHER,
            description: objection.description || '',
            status: ObjectionStatus.PENDING,
            submittedDate: new Date()
        };
        this.mockObjections.push(newObjection);
        return of(newObjection);
    }

    approveObjection(id: string, notes?: string): Observable<boolean> {
        const objection = this.mockObjections.find(o => o.id === id);
        if (objection) {
            objection.status = ObjectionStatus.APPROVED;
            objection.reviewedDate = new Date();
            objection.adminNotes = notes;
        }
        return of(true);
    }

    rejectObjection(id: string, notes?: string): Observable<boolean> {
        const objection = this.mockObjections.find(o => o.id === id);
        if (objection) {
            objection.status = ObjectionStatus.REJECTED;
            objection.reviewedDate = new Date();
            objection.adminNotes = notes;
        }
        return of(true);
    }

    updateObjectionStatus(id: string, status: ObjectionStatus, notes?: string): Observable<Objection | undefined> {
        const objection = this.mockObjections.find(o => o.id === id);
        if (objection) {
            objection.status = status;
            objection.reviewedDate = new Date();
            objection.adminNotes = notes;
        }
        return of(objection);
    }
}
