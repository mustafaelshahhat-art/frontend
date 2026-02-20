import {
    TournamentMode, TournamentFormat
} from '../../../core/models/tournament.model';

/** Which top-level tab the user is on */
export type DetailTab = 'info' | 'standings' | 'bracket' | 'matches' | 'teams';

/**
 * Categorise a TournamentMode (int enum 1-6) into one of three rendering
 * strategies used for conditional tab visibility and data loading.
 *
 *   League            → standings only
 *   Knockout          → bracket only
 *   GroupsThenKnockout → both
 */
export type ModeCategory = 'League' | 'Knockout' | 'GroupsThenKnockout';

export function classifyMode(mode?: TournamentMode, format?: string): ModeCategory {
    // Prefer the numeric mode enum coming from the DTO
    if (mode != null) {
        switch (mode) {
            case TournamentMode.LeagueSingle:
            case TournamentMode.LeagueHomeAway:
                return 'League';
            case TournamentMode.KnockoutSingle:
            case TournamentMode.KnockoutHomeAway:
                return 'Knockout';
            case TournamentMode.GroupsKnockoutSingle:
            case TournamentMode.GroupsKnockoutHomeAway:
                return 'GroupsThenKnockout';
        }
    }

    // Fallback: use the string `format` field
    switch (format) {
        case TournamentFormat.RoundRobin:
            return 'League';
        case TournamentFormat.KnockoutOnly:
            return 'Knockout';
        case TournamentFormat.GroupsThenKnockout:
        case TournamentFormat.GroupsWithHomeAwayKnockout:
            return 'GroupsThenKnockout';
        default:
            return 'League';
    }
}
