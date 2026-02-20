import { computeTeamMatches, computeTeamStats } from './team-detail.utils';
import { Match, MatchStatus } from '../../../../core/models/match.model';

type MatchVM = ReturnType<typeof computeTeamMatches>[number];

const makeMatch = (overrides: Partial<Match>): Match => ({
  id: 'match-1',
  tournamentId: 'tour-1',
  homeTeamId: 'team-A',
  homeTeamName: 'فريق أ',
  awayTeamId: 'team-B',
  awayTeamName: 'فريق ب',
  homeScore: 0,
  awayScore: 0,
  status: MatchStatus.FINISHED,
  ...overrides,
});

// ── computeTeamMatches ──────────────────────────────────────

describe('computeTeamMatches', () => {
  it('should filter matches for the given team', () => {
    const matches = [
      makeMatch({ id: 'm1', homeTeamId: 'team-A', awayTeamId: 'team-B' }),
      makeMatch({ id: 'm2', homeTeamId: 'team-C', awayTeamId: 'team-D' }),
      makeMatch({ id: 'm3', homeTeamId: 'team-C', awayTeamId: 'team-A' }),
    ];
    const result = computeTeamMatches('team-A', matches);
    expect(result).toHaveLength(2);
  });

  it('should set opponent to away team name when team is home', () => {
    const matches = [makeMatch({ homeTeamId: 'team-A', awayTeamName: 'الخصم' })];
    const result = computeTeamMatches('team-A', matches);
    expect(result[0].opponent).toBe('الخصم');
  });

  it('should set opponent to home team name when team is away', () => {
    const matches = [makeMatch({ homeTeamId: 'team-X', homeTeamName: 'الخصم', awayTeamId: 'team-A' })];
    const result = computeTeamMatches('team-A', matches);
    expect(result[0].opponent).toBe('الخصم');
  });

  it('should format score as "homeScore-awayScore"', () => {
    const matches = [makeMatch({ homeScore: 3, awayScore: 1 })];
    const result = computeTeamMatches('team-A', matches);
    expect(result[0].score).toBe('3-1');
  });

  it('should assign teamScore and opponentScore correctly for home team', () => {
    const matches = [makeMatch({ homeTeamId: 'team-A', homeScore: 2, awayScore: 1 })];
    const result = computeTeamMatches('team-A', matches);
    expect(result[0].teamScore).toBe(2);
    expect(result[0].opponentScore).toBe(1);
  });

  it('should assign teamScore and opponentScore correctly for away team', () => {
    const matches = [makeMatch({ homeTeamId: 'team-X', awayTeamId: 'team-A', homeScore: 2, awayScore: 3 })];
    const result = computeTeamMatches('team-A', matches);
    expect(result[0].teamScore).toBe(3);
    expect(result[0].opponentScore).toBe(2);
  });

  it('should return empty array when no matches involve the team', () => {
    const matches = [makeMatch({ homeTeamId: 'team-X', awayTeamId: 'team-Y' })];
    expect(computeTeamMatches('team-A', matches)).toEqual([]);
  });

  it('should return empty array for empty input', () => {
    expect(computeTeamMatches('team-A', [])).toEqual([]);
  });
});

// ── computeTeamStats ────────────────────────────────────────

describe('computeTeamStats', () => {
  const vm = (overrides: Partial<MatchVM>): MatchVM => ({
    id: '1', opponent: 'X', date: new Date(), score: '0-0',
    teamScore: 0, opponentScore: 0, status: MatchStatus.FINISHED, type: 'مباراة دوري',
    ...overrides,
  });

  it('should count only Finished matches', () => {
    const matchVMs: MatchVM[] = [
      vm({ teamScore: 2, opponentScore: 1, score: '2-1' }),
      vm({ id: '2', status: MatchStatus.SCHEDULED }),
    ];
    const stats = computeTeamStats(matchVMs);
    expect(stats.matches).toBe(1);
  });

  it('should compute wins correctly', () => {
    const matchVMs: MatchVM[] = [
      vm({ teamScore: 3, opponentScore: 1 }),
      vm({ id: '2', teamScore: 2, opponentScore: 0 }),
    ];
    const stats = computeTeamStats(matchVMs);
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(0);
    expect(stats.draws).toBe(0);
  });

  it('should compute losses correctly', () => {
    const matchVMs: MatchVM[] = [
      vm({ teamScore: 0, opponentScore: 2 }),
    ];
    const stats = computeTeamStats(matchVMs);
    expect(stats.losses).toBe(1);
    expect(stats.wins).toBe(0);
  });

  it('should compute draws correctly', () => {
    const matchVMs: MatchVM[] = [
      vm({ teamScore: 1, opponentScore: 1 }),
    ];
    const stats = computeTeamStats(matchVMs);
    expect(stats.draws).toBe(1);
  });

  it('should accumulate goalsFor and goalsAgainst', () => {
    const matchVMs: MatchVM[] = [
      vm({ teamScore: 3, opponentScore: 1 }),
      vm({ id: '2', teamScore: 1, opponentScore: 2 }),
    ];
    const stats = computeTeamStats(matchVMs);
    expect(stats.goalsFor).toBe(4);
    expect(stats.goalsAgainst).toBe(3);
  });

  it('should return zeroes for empty input', () => {
    const stats = computeTeamStats([]);
    expect(stats.matches).toBe(0);
    expect(stats.wins).toBe(0);
    expect(stats.draws).toBe(0);
    expect(stats.losses).toBe(0);
    expect(stats.goalsFor).toBe(0);
    expect(stats.goalsAgainst).toBe(0);
    expect(stats.rank).toBe(0);
  });
});
