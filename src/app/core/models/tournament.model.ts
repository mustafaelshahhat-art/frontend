export enum TournamentStatus {
    DRAFT = 'Draft',
    REGISTRATION_OPEN = 'RegistrationOpen',
    REGISTRATION_CLOSED = 'RegistrationClosed',
    ACTIVE = 'Active',
    WAITING_FOR_OPENING_MATCH_SELECTION = 'WaitingForOpeningMatchSelection',
    COMPLETED = 'Completed',
    CANCELLED = 'Cancelled'
}

export enum TournamentFormat {
    RoundRobin = 'RoundRobin',
    GroupsThenKnockout = 'GroupsThenKnockout',
    KnockoutOnly = 'KnockoutOnly',
    GroupsWithHomeAwayKnockout = 'GroupsWithHomeAwayKnockout'
}


export enum SchedulingMode {
    Random = 0,
    Manual = 1
}

export interface PaymentMethodConfig {
    type: 'E_WALLET' | 'INSTAPAY';
    label: string;
    accountNumber: string;
}

export enum TournamentLegType {
    SingleLeg = 'SingleLeg',
    HomeAndAway = 'HomeAndAway'
}

export enum LateRegistrationMode {
    None = 0,
    WaitingList = 1,
    ReplaceIfNoMatchPlayed = 2
}

export enum TournamentMode {
    LeagueSingle = 1,
    LeagueHomeAway = 2,
    GroupsKnockoutSingle = 3,
    GroupsKnockoutHomeAway = 4,
    KnockoutSingle = 5,
    KnockoutHomeAway = 6
}

export enum RegistrationStatus {
    PENDING_PAYMENT_REVIEW = 'PendingPaymentReview',
    APPROVED = 'Approved',
    REJECTED = 'Rejected',
    ELIMINATED = 'Eliminated',
    WITHDRAWN = 'Withdrawn',
    WAITING_LIST = 'WaitingList',
    PENDING_PAYMENT = 'PendingPayment'
}

export interface TeamRegistration {
    teamId: string;
    teamName: string;
    captainName: string;
    status: RegistrationStatus;
    paymentReceiptUrl?: string;  // URL to payment receipt image
    senderNumber?: string;
    paymentMethod?: string; // "E_WALLET" | "INSTAPAY"
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
    imageUrl?: string;
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
    adminId?: string; // Sync with backend AdminId
    creatorUserId?: string;

    // New Fields
    format?: string;
    matchType?: string;
    numberOfGroups?: number;
    qualifiedTeamsPerGroup?: number;
    walletNumber?: string;
    instaPayNumber?: string;
    isHomeAwayEnabled?: boolean;
    paymentMethodsJson?: string;
    paymentMethods?: PaymentMethodConfig[]; // Parsed helper
    mode?: TournamentMode;
    openingMatchId?: string;
    openingMatchHomeTeamId?: string; // Legacy alias
    openingMatchAwayTeamId?: string; // Legacy alias
    openingTeamAId?: string;
    openingTeamBId?: string;
    allowLateRegistration?: boolean;
    lateRegistrationMode?: LateRegistrationMode;
    schedulingMode?: SchedulingMode;

    winnerTeamId?: string;
    winnerTeamName?: string;
    requiresAdminIntervention?: boolean;
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
    tournamentCreatorId?: string;
    homeTeamId: string;
    awayTeamId: string;
    homeTeamName: string;
    awayTeamName: string;
    homeScore: number;
    awayScore: number;
    status: MatchStatus;

    yellowCards: Card[];
    redCards: Card[];
    goals: Goal[];
    events?: MatchEvent[];

    date?: Date;           // Date of the match

    updatedAt?: Date;
    scheduledDate?: string;
    scheduledTime?: string;
    groupId?: number;
    roundNumber?: number;
    stageName?: string;
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
    captainName: string;
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
    PENALTY = 'Penalty'
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



export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationCategory = 'system' | 'account' | 'payments' | 'tournament' | 'match' | 'team' | 'administrative' | 'security';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    category: NotificationCategory;
    priority: NotificationPriority;
    isRead: boolean;
    createdAt: Date;
    entityId?: string;
    entityType?: string;
    actionUrl?: string;
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
    rank: number;
    teamId: string;
    teamName: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
    form: string[];
    groupId?: number;
}

export interface Group {
    id: number;
    name: string;
}

export interface BracketDto {
    rounds: BracketRound[];
}

export interface BracketRound {
    roundNumber: number;
    name: string;
    matches: Match[];
}

export interface GenerateMatchesResponse {
    message: string;
    matches: Match[];
}

export interface PendingPaymentResponse {
    tournament: Tournament;
    registration: TeamRegistration;
}

export interface ManualDrawRequest {
    groupAssignments?: GroupAssignment[];
    knockoutPairings?: KnockoutPairing[];
}

export interface GroupAssignment {
    groupId: number;
    teamIds: string[];
}

export interface KnockoutPairing {
    homeTeamId: string;
    awayTeamId: string;
    roundNumber: number;
    stageName: string;
}

export interface OpeningMatchRequest {
    homeTeamId: string;
    awayTeamId: string;
}
