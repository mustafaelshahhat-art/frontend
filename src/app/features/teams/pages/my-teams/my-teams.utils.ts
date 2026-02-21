import { Team, MIN_PLAYERS_FOR_COMPLETE } from '../../../../core/models/team.model';
import { TeamData, TeamMatch, TeamFinance } from '../../../../shared/components/team-detail';
import { TeamJoinRequest } from '../../../../core/models/team-request.model';

export interface TeamStats {
    matches: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    rank: number;
}

export interface ExtendedTeam extends Team {
    stats?: TeamStats;
    isActive?: boolean;
}

export interface TeamsOverview {
    ownedTeams: Team[];
    memberTeams: Team[];
    pendingInvitations: TeamJoinRequest[];
}

export function convertToTeamData(team: ExtendedTeam): TeamData {
    return {
        id: team.id,
        name: team.name,
        city: team.city || 'غير محدد',
        captainName: team.captainName || 'غير محدد',
        status: (team.isComplete ?? (team.playerCount || 0) >= MIN_PLAYERS_FOR_COMPLETE) ? 'READY' : 'NOT_READY',
        playerCount: team.playerCount,
        maxPlayers: team.maxPlayers,
        isActive: team.isActive ?? true,
        createdAt: team.createdAt ? new Date(team.createdAt) : new Date(),
        stats: {
            matches: team.stats?.matches || 0,
            wins: team.stats?.wins || 0,
            draws: team.stats?.draws || 0,
            losses: team.stats?.losses || 0,
            goalsFor: team.stats?.goalsFor || 0,
            goalsAgainst: team.stats?.goalsAgainst || 0,
            rank: team.stats?.rank || 0
        },
        players: (team.players || []).map((p) => ({
            id: p.id,
            name: p.name,
            number: p.number || 0,
            position: p.position || 'لاعب',
            goals: p.goals || 0,
            yellowCards: p.yellowCards || 0,
            redCards: p.redCards || 0,
            status: p.status || 'active'
        })),
        matches: [] as TeamMatch[],
        finances: [] as TeamFinance[],
        invitations: []
    };
}
