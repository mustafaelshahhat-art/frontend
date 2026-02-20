import { Match } from '../../../../core/models/tournament.model';

/** Pure function: compute match view models for a given team */
export function computeTeamMatches(teamId: string, matches: Match[]) {
    return matches
        .filter((m: Match) => m.homeTeamId === teamId || m.awayTeamId === teamId)
        .map((m: Match) => ({
            id: m.id,
            opponent: m.homeTeamId === teamId ? m.awayTeamName : m.homeTeamName,
            date: m.date ? new Date(m.date) : new Date(),
            score: `${m.homeScore}-${m.awayScore}`,
            teamScore: m.homeTeamId === teamId ? m.homeScore : m.awayScore,
            opponentScore: m.homeTeamId === teamId ? m.awayScore : m.homeScore,
            status: m.status,
            type: 'مباراة دوري'
        }));
}

/** Pure function: compute aggregate stats from match view models */
export function computeTeamStats(matches: ReturnType<typeof computeTeamMatches>) {
    const stats = { matches: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, rank: 0 };
    matches.filter(m => m.status === 'Finished').forEach(m => {
        stats.matches++;
        stats.goalsFor += m.teamScore || 0;
        stats.goalsAgainst += m.opponentScore || 0;
        if (m.teamScore! > m.opponentScore!) stats.wins++;
        else if (m.teamScore! < m.opponentScore!) stats.losses++;
        else stats.draws++;
    });
    return stats;
}
