export interface Objection {
    id: string;
    tournamentId: string;
    tournamentName: string;
    matchId: string;
    homeTeamName: string;
    awayTeamName: string;
    teamId: string;
    teamName: string;
    captainId: string;
    captainName: string;
    type: ObjectionType;
    description: string;
    evidence?: string[];
    status: ObjectionStatus;
    createdAt: Date;
    reviewedDate?: Date;
    reviewedBy?: string;
    adminNotes?: string;
}

export enum ObjectionType {
    MATCH_RESULT = 'MatchResult',
    PLAYER_ELIGIBILITY = 'PlayerEligibility',
    RULE_VIOLATION = 'RuleViolation',
    OTHER = 'Other'
}

export enum ObjectionStatus {
    PENDING = 'Pending',
    UNDER_REVIEW = 'UnderReview',
    APPROVED = 'Approved',
    REJECTED = 'Rejected'
}
