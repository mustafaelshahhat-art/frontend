/**
 * ==========================================================================
 * STATUS LABELS - Centralized Status Display System
 * ==========================================================================
 * Single source of truth for all status labels & styling across the app.
 * Use these utilities instead of hardcoding status text in components.
 * ==========================================================================
 */

// ==========================================================================
// STATUS ENUMS
// ==========================================================================

export enum TeamStatus {
    READY = 'READY',
    NOT_READY = 'NOT_READY',
    INACTIVE = 'INACTIVE'
}

export enum UserStatus {
    ACTIVE = 'ACTIVE',
    SUSPENDED = 'SUSPENDED',
    PENDING = 'PENDING'
}

export enum MatchStatus {
    SCHEDULED = 'Scheduled',
    LIVE = 'Live',
    FINISHED = 'Finished',
    CANCELLED = 'Cancelled',
    POSTPONED = 'Postponed',
    RESCHEDULED = 'Rescheduled'
}

export enum TournamentStatus {
    UPCOMING = 'UPCOMING',
    ACTIVE = 'ACTIVE',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED'
}

export enum PlayerStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    SUSPENDED = 'suspended',
    BANNED = 'banned',
    INJURED = 'injured'
}

export enum PlayerPosition {
    GOALKEEPER = 'goalkeeper',
    DEFENDER = 'defender',
    MIDFIELDER = 'midfielder',
    FORWARD = 'forward'
}

export enum MatchEventType {
    GOAL = 'GOAL',
    YELLOW_CARD = 'YELLOW_CARD',
    RED_CARD = 'RED_CARD',
    PENALTY = 'PENALTY',
    SUBSTITUTION = 'SUBSTITUTION'
}

// ==========================================================================
// MATCH EVENT LABELS
// ==========================================================================

export const MATCH_EVENT_LABELS: Record<string, StatusConfig> = {
    [MatchEventType.GOAL]: {
        label: 'هدف',
        variant: 'success', // or primary
        icon: 'sports_soccer'
    },
    [MatchEventType.YELLOW_CARD]: {
        label: 'بطاقة صفراء',
        variant: 'warning',
        icon: 'content_copy'
    },
    [MatchEventType.RED_CARD]: {
        label: 'بطاقة حمراء',
        variant: 'danger',
        icon: 'content_copy'
    },
    [MatchEventType.PENALTY]: {
        label: 'ركلة جزاء',
        variant: 'info',
        icon: 'sports_soccer'
    }
    // Substitution can be added if needed
};

// ==========================================================================
// BADGE VARIANT TYPES
// ==========================================================================

export type BadgeVariant =
    | 'primary'
    | 'gold'
    | 'danger'
    | 'info'
    | 'warning'
    | 'success'
    | 'muted';

// ==========================================================================
// STATUS CONFIGURATION INTERFACE
// ==========================================================================

export interface StatusConfig {
    label: string;
    variant: BadgeVariant;
    icon?: string;
}

// ==========================================================================
// TEAM STATUS LABELS
// ==========================================================================

export const TEAM_STATUS_LABELS: Record<string, StatusConfig> = {
    [TeamStatus.READY]: {
        label: 'فريق مكتمل',
        variant: 'primary',
        icon: 'check_circle'
    },
    [TeamStatus.NOT_READY]: {
        label: 'فريق غير مكتمل',
        variant: 'warning',
        icon: 'pending'
    },
    [TeamStatus.INACTIVE]: {
        label: 'غير نشط',
        variant: 'danger',
        icon: 'cancel'
    }
};

// ==========================================================================
// USER STATUS LABELS
// ==========================================================================

export const USER_STATUS_LABELS: Record<string, StatusConfig> = {
    [UserStatus.ACTIVE]: {
        label: 'نشط',
        variant: 'primary',
        icon: 'check_circle'
    },
    [UserStatus.SUSPENDED]: {
        label: 'موقوف',
        variant: 'danger',
        icon: 'block'
    },
    [UserStatus.PENDING]: {
        label: 'قيد المراجعة',
        variant: 'warning',
        icon: 'hourglass_top'
    }
};

// ==========================================================================
// MATCH STATUS LABELS
// ==========================================================================

export const MATCH_STATUS_LABELS: Record<string, StatusConfig> = {
    [MatchStatus.SCHEDULED]: {
        label: 'قادمة',
        variant: 'info',
        icon: 'schedule'
    },
    [MatchStatus.LIVE]: {
        label: 'مباشر',
        variant: 'danger',
        icon: 'sensors'
    },
    [MatchStatus.FINISHED]: {
        label: 'منتهية',
        variant: 'muted',
        icon: 'sports_score'
    },
    [MatchStatus.CANCELLED]: {
        label: 'ملغاة',
        variant: 'danger',
        icon: 'cancel'
    },
    [MatchStatus.POSTPONED]: {
        label: 'مؤجلة',
        variant: 'warning',
        icon: 'event_busy'
    },
    [MatchStatus.RESCHEDULED]: {
        label: 'معاد جدولتها',
        variant: 'info',
        icon: 'event_repeat'
    }
};

// ==========================================================================
// TOURNAMENT STATUS LABELS
// ==========================================================================

export const TOURNAMENT_STATUS_LABELS: Record<string, StatusConfig> = {
    [TournamentStatus.UPCOMING]: {
        label: 'قادمة',
        variant: 'info',
        icon: 'event'
    },
    [TournamentStatus.ACTIVE]: {
        label: 'نشطة',
        variant: 'primary',
        icon: 'play_circle'
    },
    [TournamentStatus.IN_PROGRESS]: {
        label: 'جارية',
        variant: 'primary',
        icon: 'play_circle'
    },
    [TournamentStatus.COMPLETED]: {
        label: 'مكتملة',
        variant: 'muted',
        icon: 'emoji_events'
    },
    [TournamentStatus.CANCELLED]: {
        label: 'ملغاة',
        variant: 'danger',
        icon: 'cancel'
    }
};

// ==========================================================================
// PLAYER STATUS LABELS
// ==========================================================================

export const PLAYER_STATUS_LABELS: Record<string, StatusConfig> = {
    [PlayerStatus.ACTIVE]: {
        label: 'نشط',
        variant: 'primary',
        icon: 'check_circle'
    },
    [PlayerStatus.INACTIVE]: {
        label: 'غير نشط',
        variant: 'muted',
        icon: 'person_off'
    },
    [PlayerStatus.SUSPENDED]: {
        label: 'موقوف',
        variant: 'warning',
        icon: 'pause_circle'
    },
    [PlayerStatus.BANNED]: {
        label: 'محظور',
        variant: 'danger',
        icon: 'block'
    },
    [PlayerStatus.INJURED]: {
        label: 'مصاب',
        variant: 'danger',
        icon: 'personal_injury'
    }
};

// ==========================================================================
// PLAYER POSITION LABELS
// ==========================================================================

export const PLAYER_POSITION_LABELS: Record<string, StatusConfig> = {
    [PlayerPosition.GOALKEEPER]: {
        label: 'حارس مرمى',
        variant: 'warning',
        icon: 'sports_handball'
    },
    [PlayerPosition.DEFENDER]: {
        label: 'مدافع',
        variant: 'info',
        icon: 'shield'
    },
    [PlayerPosition.MIDFIELDER]: {
        label: 'وسط',
        variant: 'primary',
        icon: 'directions_run'
    },
    [PlayerPosition.FORWARD]: {
        label: 'مهاجم',
        variant: 'gold',
        icon: 'sports_soccer'
    }
};

// ==========================================================================
// HELPER FUNCTIONS
// ==========================================================================

/**
 * Get team status configuration
 */
export function getTeamStatus(status: string): StatusConfig {
    return TEAM_STATUS_LABELS[status] || TEAM_STATUS_LABELS[TeamStatus.NOT_READY];
}

/**
 * Get user status configuration
 */
export function getUserStatus(status: string): StatusConfig {
    return USER_STATUS_LABELS[status] || USER_STATUS_LABELS[UserStatus.ACTIVE];
}

/**
 * Get match status configuration
 */
export function getMatchStatus(status: string): StatusConfig {
    // Try exact, then capitalized, then uppercase
    const normalized = status?.charAt(0).toUpperCase() + status?.slice(1).toLowerCase();
    const upper = status?.toUpperCase();

    return MATCH_STATUS_LABELS[status]
        || MATCH_STATUS_LABELS[normalized]
        || MATCH_STATUS_LABELS[upper]
        || MATCH_STATUS_LABELS[MatchStatus.SCHEDULED];
}

/**
 * Get tournament status configuration
 */
export function getTournamentStatus(status: string): StatusConfig {
    return TOURNAMENT_STATUS_LABELS[status] || TOURNAMENT_STATUS_LABELS[TournamentStatus.UPCOMING];
}

/**
 * Get player status configuration
 */
export function getPlayerStatus(status: string): StatusConfig {
    const normalizedStatus = status?.toLowerCase() || 'active';
    return PLAYER_STATUS_LABELS[normalizedStatus] || PLAYER_STATUS_LABELS[PlayerStatus.ACTIVE];
}

/**
 * Get match event configuration
 */
export function getMatchEvent(type: string): StatusConfig {
    const normalizedType = type?.toUpperCase() || 'GOAL';
    return MATCH_EVENT_LABELS[normalizedType] || { label: 'حدث', variant: 'muted', icon: 'info' };
}

/**
 * Get player position configuration
 */
export function getPlayerPosition(position: string): StatusConfig {
    const normalizedPosition = position?.toLowerCase() || 'midfielder';
    return PLAYER_POSITION_LABELS[normalizedPosition] || PLAYER_POSITION_LABELS[PlayerPosition.MIDFIELDER];
}

/**
 * Generic status resolver - tries all status types
 */
export function resolveStatus(type: 'team' | 'user' | 'match' | 'tournament' | 'player' | 'match-event', status: string): StatusConfig {
    switch (type) {
        case 'team': return getTeamStatus(status);
        case 'user': return getUserStatus(status);
        case 'match': return getMatchStatus(status);
        case 'tournament': return getTournamentStatus(status);
        case 'player': return getPlayerStatus(status);
        case 'match-event': return getMatchEvent(status);
        default: return { label: status, variant: 'muted' };
    }
}
