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
