export enum TournamentStatus {
    DRAFT = 'draft',
    REGISTRATION_OPEN = 'registration_open',
    REGISTRATION_CLOSED = 'registration_closed',
    ACTIVE = 'active',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled'
}

export enum RegistrationStatus {
    PENDING_PAYMENT_REVIEW = 'PendingPaymentReview',
    APPROVED = 'Approved',
    REJECTED = 'Rejected',
    ELIMINATED = 'Eliminated',
    WITHDRAWN = 'Withdrawn'
}

export interface TeamRegistration {
    teamId: string;
    teamName: string;
    captainId: string;
    captainName: string;
    status: RegistrationStatus;
    paymentReceiptUrl?: string;  // URL to payment receipt image
    senderNumber?: string;
    paymentDate?: Date;
    approvedBy?: string;         // Admin who approved/rejected
    approvalDate?: Date;
    rejectionReason?: string;
    teamLogoUrl?: string;
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
    prizes: string;
    prizePool?: number;
    startDate: Date;
    endDate: Date;
    rules: string;
    adminId: string;
    imageUrl?: string;
    winnerTeamId?: string;
    winnerTeamName?: string;
    createdAt: Date;
    updatedAt: Date;
}


export enum MatchStatus {
    SCHEDULED = 'Scheduled',
    LIVE = 'Live',
    HALFTIME = 'Halftime',
    FINISHED = 'Finished',
    CANCELLED = 'Cancelled',
    POSTPONED = 'Postponed',
    RESCHEDULED = 'Rescheduled'
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
    refereeNotes?: string;
    updatedAt?: Date;
    scheduledDate?: string;
    scheduledTime?: string;
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
    minute?: number;
}

export interface Goal {
    playerId: string;
    playerName: string;
    teamId: string;
    assistPlayerId?: string;
    minute?: number;
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
    userId?: string;
}

export enum MatchEventType {
    GOAL = 'Goal',
    YELLOW_CARD = 'YellowCard',
    RED_CARD = 'RedCard',
    PENALTY = 'Penalty',
    OWN_GOAL = 'OwnGoal'
}

export interface MatchEvent {
    id: string;
    matchId: string;
    type: MatchEventType;
    playerId?: string;
    playerName?: string;
    teamId: string;
    minute?: number;
    description?: string;
    createdAt: Date;
}



export interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'system' | 'match' | 'team' | 'invite' | 'join_request' | 'invite_accepted' | 'invite_rejected' | 'join_accepted' | 'join_rejected';
    isRead: boolean;
    createdAt: Date;
}

export interface MatchMessage {
    id: string;
    matchId: string;
    senderId: string;
    senderName: string;
    role: string;
    content: string;
    timestamp: Date;
}

export interface TournamentStanding {
    teamId: string;
    teamName: string;
    teamLogoUrl?: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
    form: string[];
}

export interface GenerateMatchesResponse {
    message: string;
    matches: Match[];
}

export interface PendingPaymentResponse {
    tournament: Tournament;
    registration: TeamRegistration;
}
