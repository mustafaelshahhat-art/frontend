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
    phone: string;
    userId: string;
    number?: number;
    position?: string;
    status?: string;
    teamRole?: 'Captain' | 'Member';
}

export interface JoinRequest {
    id: string;
    playerId: string;
    playerDisplayId: string;
    playerName: string;
    requestDate: Date;
    status: 'pending' | 'approved' | 'rejected';
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
    teamLogoUrl?: string;
    registeredAt: Date;
}

export interface Team {
    id: string;
    name: string;
    captainName: string;
    founded: string;
    logo?: string;
    logoUrl?: string; // Backend compatibility
    players: Player[];
    joinRequests: JoinRequest[];
    invitations?: TeamJoinRequest[];
    city?: string;
    playerCount?: number;
    maxPlayers?: number;
    isActive?: boolean;
    status?: string;
    createdAt?: Date | string;
    isReady?: boolean; // Backend compatibility
    stats?: {
        matches: number;
        wins: number;
        draws: number;
        losses: number;
        goalsFor: number;
        goalsAgainst: number;
        rank: number;
    };
    matches?: {
        id: string;
        opponent: string;
        opponentLogo?: string;
        date: string | Date;
        score?: string;
        teamScore?: number;
        opponentScore?: number;
        status: string;
        type: string;
    }[];
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
