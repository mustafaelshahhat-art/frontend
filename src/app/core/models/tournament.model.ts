export enum TournamentStatus {
    DRAFT = 'draft',
    REGISTRATION_OPEN = 'registration_open',
    REGISTRATION_CLOSED = 'registration_closed',
    ACTIVE = 'active',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled'
}

export enum RegistrationStatus {
    PENDING_PAYMENT = 'pending_payment',    // Team submitted, awaiting payment
    PENDING_APPROVAL = 'pending_approval',  // Payment submitted, awaiting admin verification
    APPROVED = 'approved',                  // Admin approved, team is in the tournament
    REJECTED = 'rejected'                   // Admin rejected the payment
}

export interface TeamRegistration {
    teamId: string;
    teamName: string;
    captainId: string;
    captainName: string;
    status: RegistrationStatus;
    paymentReceiptUrl?: string;  // URL to payment receipt image
    paymentDate?: Date;
    approvedBy?: string;         // Admin who approved/rejected
    approvalDate?: Date;
    rejectionReason?: string;
    registeredAt: Date;
}

export interface Tournament {
    id: string;
    name: string;
    nameAr?: string;
    nameEn?: string;
    description: string;
    season?: string;
    region?: string;
    status: TournamentStatus;
    location: string;
    entryFee: number;
    maxTeams: number;
    minTeams?: number;
    currentTeams: number;
    registrations: TeamRegistration[]; // Team registrations with payment status
    registrationFee?: number;
    registrationDeadline: Date;
    prizes: string[];
    prizePool?: number;
    startDate: Date;
    endDate: Date;
    rules: string;
    adminId: string;
    imageUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}


export enum MatchStatus {
    SCHEDULED = 'scheduled',
    LIVE = 'live',
    HALFTIME = 'halftime',
    FINISHED = 'finished',
    CANCELLED = 'cancelled',
    POSTPONED = 'postponed'
}

export interface Match {
    id: string;
    tournamentId: string;
    tournamentName?: string;
    homeTeamId: string;
    awayTeamId: string;
    homeTeamName: string;
    awayTeamName: string;
    homeTeamLogoUrl?: string;
    awayTeamLogoUrl?: string;
    homeScore: number;
    awayScore: number;
    status: MatchStatus;
    refereeId: string;
    refereeName: string;
    yellowCards: Card[];
    redCards: Card[];
    goals: Goal[];
    events?: MatchEvent[];
    report?: MatchReport;  // Referee's final match report
    date?: Date;           // Date of the match
}

export interface MatchReport {
    submittedAt: Date;
    refereeId: string;
    refereeName: string;
    notes: string;  // Referee's additional notes/observations
    homeTeamYellowCards: number;
    homeTeamRedCards: number;
    homeTeamGoals: number;
    awayTeamYellowCards: number;
    awayTeamRedCards: number;
    awayTeamGoals: number;
    isSubmitted: boolean;
}


export interface Card {
    playerId: string;
    playerName: string;
    teamId: string;
    type: 'yellow' | 'red';
}

export interface Goal {
    playerId: string;
    playerName: string;
    teamId: string;
    assistPlayerId?: string;
}

export interface Team {
    id: string;
    name: string;
    captainId: string;
    captainName: string;
    logoUrl?: string;
    players: Player[];
    createdAt: Date;
}

export interface Player {
    id: string;
    name: string;
    nationalId: string;
}

export enum MatchEventType {
    GOAL = 'goal',
    YELLOW_CARD = 'yellow_card',
    RED_CARD = 'red_card',
    PENALTY = 'penalty',
    OWN_GOAL = 'own_goal'
}

export interface MatchEvent {
    id: string;
    matchId: string;
    type: MatchEventType;
    playerId?: string;
    playerName?: string;
    teamId: string;
    description?: string;
    createdAt: Date;
}


