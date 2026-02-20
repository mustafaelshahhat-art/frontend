// ──────────────────────────────────────────────────────────
// Match domain models — aligned with backend MatchDto / MatchEventDto / MatchMessageDto
// ──────────────────────────────────────────────────────────

export enum MatchStatus {
    SCHEDULED = 'Scheduled',
    LIVE = 'Live',
    HALFTIME = 'Halftime',
    FINISHED = 'Finished',
    CANCELLED = 'Cancelled',
    POSTPONED = 'Postponed',
    RESCHEDULED = 'Rescheduled'
}

export enum MatchEventType {
    GOAL = 'Goal',
    YELLOW_CARD = 'YellowCard',
    RED_CARD = 'RedCard',
    PENALTY = 'Penalty'
}

export interface MatchEvent {
    id: string;
    type: MatchEventType;
    teamId: string;
    playerId?: string;
    playerName?: string;
    minute?: number;
    // Frontend-only fields (not in backend MatchEventDto)
    matchId?: string;
    description?: string;
    createdAt?: Date;
}

export interface Match {
    id: string;
    tournamentId: string;
    homeTeamId: string;
    homeTeamName: string;
    awayTeamId: string;
    awayTeamName: string;
    homeScore: number;
    awayScore: number;
    groupId?: number;
    roundNumber?: number;
    stageName?: string;
    status: MatchStatus;
    date?: Date;
    tournamentName?: string;
    tournamentCreatorId?: string;
    events?: MatchEvent[];
    // Frontend-only fields for backward compatibility
    yellowCards?: Card[];
    redCards?: Card[];
    goals?: Goal[];
    updatedAt?: Date;
    scheduledDate?: string;
    scheduledTime?: string;
}

/** @deprecated Use MatchEvent with type='YellowCard'|'RedCard' instead */
export interface Card {
    playerId: string;
    playerName: string;
    teamId: string;
    type: 'yellow' | 'red';
    minute?: number;
}

/** @deprecated Use MatchEvent with type='Goal' instead */
export interface Goal {
    playerId: string;
    playerName: string;
    teamId: string;
    assistPlayerId?: string;
    minute?: number;
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
