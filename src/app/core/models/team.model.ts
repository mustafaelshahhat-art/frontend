import { User } from './user.model';

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
    registeredAt: Date;
}

export interface Team {
    id: string;
    name: string;
    captainId: string;
    captainName: string;
    founded: string;
    logo?: string;
    players: Player[];
    joinRequests: JoinRequest[];
    invitations?: any[]; // for legacy compat if needed
    // Added for UI compatibility
    city?: string;
    playerCount?: number;
    maxPlayers?: number;
    isActive?: boolean;
    status?: string;
    createdAt?: Date;
}

// Maximum players in a team (including captain)
export const MAX_TEAM_PLAYERS = 10;
