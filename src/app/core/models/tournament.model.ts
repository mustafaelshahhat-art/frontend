// ──────────────────────────────────────────────────────────
// Tournament domain models — aligned with backend TournamentDto
// Match/Notification types moved to their own model files.
// ──────────────────────────────────────────────────────────
import { Match } from './match.model';

// Re-export Match types for backward compat (consumers should migrate)
export type { Match, MatchEvent, Card, Goal, MatchMessage } from './match.model';
export { MatchStatus, MatchEventType } from './match.model';
export type { Notification } from './notification.model';
export type { NotificationType, NotificationCategory, NotificationPriority } from './notification.model';

export enum TournamentStatus {
    DRAFT = 'Draft',
    REGISTRATION_OPEN = 'RegistrationOpen',
    REGISTRATION_CLOSED = 'RegistrationClosed',
    ACTIVE = 'Active',
    WAITING_FOR_OPENING_MATCH_SELECTION = 'WaitingForOpeningMatchSelection',
    COMPLETED = 'Completed',
    CANCELLED = 'Cancelled',
    MANUAL_QUALIFICATION_PENDING = 'ManualQualificationPending',
    QUALIFICATION_CONFIRMED = 'QualificationConfirmed'
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
    id?: string;               // Backend: TeamRegistrationDto.Id
    tournamentId?: string;     // Backend: TeamRegistrationDto.TournamentId
    teamId: string;
    teamName: string;
    captainName: string;
    status: RegistrationStatus;
    paymentReceiptUrl?: string;
    senderNumber?: string;
    paymentMethod?: string;
    rejectionReason?: string;
    registeredAt: Date;
    isQualifiedForKnockout?: boolean;
    // Frontend-only fields
    paymentDate?: Date;
    approvedBy?: string;
    approvalDate?: Date;
}

export interface Tournament {
    id: string;
    name: string;
    nameAr?: string;
    nameEn?: string;
    creatorUserId?: string;
    imageUrl?: string;
    status: TournamentStatus;
    mode?: TournamentMode;
    startDate: Date;
    endDate: Date;
    registrationDeadline: Date;
    entryFee: number;
    maxTeams: number;
    minTeams?: number;
    currentTeams: number;
    location: string;
    description: string;
    rules: string;
    prizes: string;
    format?: string;
    matchType?: string;
    numberOfGroups?: number;
    walletNumber?: string;
    instaPayNumber?: string;
    isHomeAwayEnabled?: boolean;
    paymentMethodsJson?: string;
    registrations: TeamRegistration[];
    winnerTeamId?: string;
    winnerTeamName?: string;
    requiresAdminIntervention?: boolean;
    allowLateRegistration?: boolean;
    lateRegistrationMode?: LateRegistrationMode;
    schedulingMode?: SchedulingMode;
    openingMatchHomeTeamId?: string;
    openingMatchAwayTeamId?: string;
    openingMatchId?: string;
    adminId?: string;
    createdAt: Date;
    updatedAt: Date;
    // Frontend-only helpers
    paymentMethods?: PaymentMethodConfig[];
    qualifiedTeamsPerGroup?: number;
    registrationFee?: number;
    prizePool?: number;
    season?: string;
    region?: string;
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
    yellowCards?: number;    // Backend: TournamentStandingDto.YellowCards
    redCards?: number;       // Backend: TournamentStandingDto.RedCards
    groupId?: number;
    form: string[];
}

export interface Group {
    id: number;
    name: string;
    [key: string]: unknown;
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
    matches: Match[];
    count: number;
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
