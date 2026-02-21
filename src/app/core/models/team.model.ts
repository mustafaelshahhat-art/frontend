// ──────────────────────────────────────────────────────────
// Team domain models — aligned with backend TeamDto / PlayerDto / JoinRequestDto
// ──────────────────────────────────────────────────────────
import { TeamJoinRequest } from './team-request.model';

export interface PlayerStats {
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
}

export interface Player extends PlayerStats {
    id: string;
    displayId: string;
    name: string;
    teamId?: string;
    userId?: string;
    number?: number;
    position?: string;
    status?: string;
    teamRole?: 'Captain' | 'Member';
}

export interface JoinRequest {
    id: string;
    playerId: string;
    playerDisplayId?: string;    // Frontend display helper
    playerName: string;
    teamId?: string;             // Backend: JoinRequestDto.TeamId
    teamName?: string;           // Backend: JoinRequestDto.TeamName
    requestDate: Date;
    status: string;
    initiatedByPlayer?: boolean;
}

export interface TeamRegistration {
    tournamentId: string;
    tournamentName?: string;
    teamId: string;
    teamName: string;
    captainName: string;
    status: 'PendingPaymentReview' | 'Approved' | 'Rejected';
    paymentReceiptUrl?: string;
    rejectionReason?: string;
    registeredAt: Date;
}

export interface Team {
    id: string;
    name: string;
    captainName: string;
    founded: string;
    city?: string;
    isActive?: boolean;
    playerCount?: number;
    maxPlayers?: number;
    isComplete?: boolean;
    stats?: TeamStats;
    players: Player[];
    joinRequests?: JoinRequest[];
    invitations?: TeamJoinRequest[];
    createdAt?: Date | string;
    // Frontend-only fields
    status?: string;
    isReady?: boolean;
    matches?: {
        id: string;
        opponent: string;
        date: string | Date;
        score?: string;
        teamScore?: number;
        opponentScore?: number;
        status: string;
        type: string;
    }[];
}

export interface TeamStats {
    matches: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    rank: number;
}

export interface ApiTeamMatch {
    id: string;
    homeTeamId: string;
    awayTeamName: string;
    homeTeamName: string;
    date: string | Date;
    homeScore: number;
    awayScore: number;
    status: string;
    awayTeamId: string;
}

export interface ApiTeamFinance {
    tournamentId: string;
    tournamentName: string;
    registeredAt: string | Date;
    status: string;
}

// Maximum players in a team (including captain)
export const MAX_TEAM_PLAYERS = 10;

// Minimum players required for a team to be considered complete
export const MIN_PLAYERS_FOR_COMPLETE = 6;
