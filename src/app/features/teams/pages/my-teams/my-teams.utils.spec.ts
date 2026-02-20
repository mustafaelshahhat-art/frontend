import { convertToTeamData, ExtendedTeam } from './my-teams.utils';

describe('convertToTeamData', () => {
  const baseTeam: ExtendedTeam = {
    id: 'team-1',
    name: 'الأهلي',
    captainName: 'محمد',
    founded: '2020',
    city: 'القاهرة',
    playerCount: 10,
    maxPlayers: 18,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    players: [
      {
        id: 'p1',
        displayId: 'P001',
        name: 'أحمد',
        number: 10,
        position: 'مهاجم',
        goals: 5,
        yellowCards: 1,
        redCards: 0,
        assists: 3,
        status: 'active',
      },
    ],
    stats: {
      matches: 10,
      wins: 7,
      draws: 2,
      losses: 1,
      goalsFor: 20,
      goalsAgainst: 8,
      rank: 1,
    },
  };

  it('should convert team id and name', () => {
    const result = convertToTeamData(baseTeam);
    expect(result.id).toBe('team-1');
    expect(result.name).toBe('الأهلي');
  });

  it('should set city from team data', () => {
    const result = convertToTeamData(baseTeam);
    expect(result.city).toBe('القاهرة');
  });

  it('should default city to "غير محدد" when not provided', () => {
    const noCity = { ...baseTeam, city: undefined };
    const result = convertToTeamData(noCity);
    expect(result.city).toBe('غير محدد');
  });

  it('should default captainName when not provided', () => {
    const noCaptain = { ...baseTeam, captainName: undefined as any };
    const result = convertToTeamData(noCaptain);
    expect(result.captainName).toBe('غير محدد');
  });

  it('should set status to READY when playerCount >= 8', () => {
    const result = convertToTeamData(baseTeam);
    expect(result.status).toBe('READY');
  });

  it('should set status to NOT_READY when playerCount < 8', () => {
    const small = { ...baseTeam, playerCount: 5 };
    const result = convertToTeamData(small);
    expect(result.status).toBe('NOT_READY');
  });

  it('should handle undefined playerCount as NOT_READY', () => {
    const noCount = { ...baseTeam, playerCount: undefined };
    const result = convertToTeamData(noCount);
    expect(result.status).toBe('NOT_READY');
  });

  it('should map stats from team', () => {
    const result = convertToTeamData(baseTeam);
    expect(result.stats.wins).toBe(7);
    expect(result.stats.goalsFor).toBe(20);
    expect(result.stats.rank).toBe(1);
  });

  it('should default stats to 0 when not provided', () => {
    const noStats = { ...baseTeam, stats: undefined };
    const result = convertToTeamData(noStats);
    expect(result.stats.matches).toBe(0);
    expect(result.stats.wins).toBe(0);
    expect(result.stats.rank).toBe(0);
  });

  it('should map players with defaults for missing fields', () => {
    const withBarePlayer: ExtendedTeam = {
      ...baseTeam,
      players: [{ id: 'p2', displayId: 'P002', name: 'علي', goals: 0, assists: 0, yellowCards: 0, redCards: 0 }],
    };
    const result = convertToTeamData(withBarePlayer);
    expect(result.players[0].number).toBe(0);
    expect(result.players[0].position).toBe('لاعب');
    expect(result.players[0].status).toBe('active');
  });

  it('should return empty arrays for matches, finances, invitations', () => {
    const result = convertToTeamData(baseTeam);
    expect(result.matches).toEqual([]);
    expect(result.finances).toEqual([]);
    expect(result.invitations).toEqual([]);
  });

  it('should handle empty players array', () => {
    const noPlayers = { ...baseTeam, players: [] };
    const result = convertToTeamData(noPlayers);
    expect(result.players).toEqual([]);
  });
});
