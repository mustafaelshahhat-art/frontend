import {
  formatTime,
  formatDate,
  getRoleLabel,
  getRoleBadgeClass,
  translateRole,
  formatScheduledDate,
  getMinDate,
  buildParticipants,
  checkMatchAuthorization,
  ChatParticipantRole,
} from './match-chat.utils';
import { Match, MatchStatus } from '../../../../core/models/match.model';
import { User, UserRole, UserStatus } from '../../../../core/models/user.model';

// ── formatTime ──────────────────────────────────────────────

describe('formatTime', () => {
  it('should format a morning time in ar-SA locale', () => {
    const date = new Date(2025, 5, 15, 9, 30);
    const result = formatTime(date);
    // Should return a non-empty time string
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('should format an afternoon time', () => {
    const date = new Date(2025, 0, 1, 14, 5);
    const result = formatTime(date);
    expect(result).toBeTruthy();
  });

  it('should format midnight', () => {
    const date = new Date(2025, 0, 1, 0, 0);
    const result = formatTime(date);
    expect(result).toBeTruthy();
  });
});

// ── formatDate ──────────────────────────────────────────────

describe('formatDate', () => {
  it('should return "اليوم" for today', () => {
    const now = new Date();
    expect(formatDate(now)).toBe('اليوم');
  });

  it('should return "أمس" for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(formatDate(yesterday)).toBe('أمس');
  });

  it('should return "منذ X أيام" for 2-6 days ago', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    expect(formatDate(threeDaysAgo)).toBe('منذ 3 أيام');
  });

  it('should return formatted locale date for 7+ days ago', () => {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const result = formatDate(twoWeeksAgo);
    // Should not be one of the short-form strings
    expect(result).not.toBe('اليوم');
    expect(result).not.toBe('أمس');
    expect(result).not.toContain('منذ');
  });
});

// ── getRoleLabel ────────────────────────────────────────────

describe('getRoleLabel', () => {
  it('should return "مشرف" for ADMIN', () => {
    expect(getRoleLabel(ChatParticipantRole.ADMIN)).toBe('مشرف');
  });

  it('should return "قائد" for CAPTAIN', () => {
    expect(getRoleLabel(ChatParticipantRole.CAPTAIN)).toBe('قائد');
  });

  it('should return "لاعب" for PLAYER', () => {
    expect(getRoleLabel(ChatParticipantRole.PLAYER)).toBe('لاعب');
  });

  it('should return empty string for unknown role', () => {
    expect(getRoleLabel('unknown' as ChatParticipantRole)).toBe('');
  });
});

// ── getRoleBadgeClass ──────────────────────────────────────

describe('getRoleBadgeClass', () => {
  it('should return "badge-danger" for ADMIN', () => {
    expect(getRoleBadgeClass(ChatParticipantRole.ADMIN)).toBe('badge-danger');
  });

  it('should return "badge-gold" for CAPTAIN', () => {
    expect(getRoleBadgeClass(ChatParticipantRole.CAPTAIN)).toBe('badge-gold');
  });

  it('should return "badge-primary" for PLAYER', () => {
    expect(getRoleBadgeClass(ChatParticipantRole.PLAYER)).toBe('badge-primary');
  });

  it('should return "badge-muted" for unknown role', () => {
    expect(getRoleBadgeClass('unknown' as ChatParticipantRole)).toBe('badge-muted');
  });
});

// ── translateRole ──────────────────────────────────────────

describe('translateRole', () => {
  it('should return "admin" for Admin', () => {
    expect(translateRole('Admin')).toBe('admin');
  });

  it('should return "organizer" for TournamentCreator', () => {
    expect(translateRole('TournamentCreator')).toBe('organizer');
  });

  it('should return "captain" for captain', () => {
    expect(translateRole('captain')).toBe('captain');
  });

  it('should return "player" for any other role', () => {
    expect(translateRole('Player')).toBe('player');
    expect(translateRole('something')).toBe('player');
  });

  it('should return "player" for undefined', () => {
    expect(translateRole(undefined)).toBe('player');
  });
});

// ── formatScheduledDate ────────────────────────────────────

describe('formatScheduledDate', () => {
  it('should format an ISO date string with Arabic locale', () => {
    const result = formatScheduledDate('2025-06-15T10:00:00Z');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('should include weekday in the formatted output', () => {
    const result = formatScheduledDate('2025-01-01T00:00:00Z');
    // Arabic weekday names are returned by ar-SA locale
    expect(result.length).toBeGreaterThan(5);
  });
});

// ── getMinDate ─────────────────────────────────────────────

describe('getMinDate', () => {
  it('should return today in YYYY-MM-DD format', () => {
    const result = getMinDate();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const today = new Date().toISOString().split('T')[0];
    expect(result).toBe(today);
  });
});

// ── buildParticipants ──────────────────────────────────────

describe('buildParticipants', () => {
  const match: Partial<Match> = {
    homeTeamId: 'team-1',
    homeTeamName: 'الأهلي',
    awayTeamId: 'team-2',
    awayTeamName: 'الزمالك',
    tournamentCreatorId: 'creator-1',
  };

  it('should return 4 participants', () => {
    const participants = buildParticipants(match as Match);
    expect(participants).toHaveLength(4);
  });

  it('should include system admin with ADMIN role', () => {
    const participants = buildParticipants(match as Match);
    const admin = participants.find(p => p.id === 'system-admin');
    expect(admin).toBeDefined();
    expect(admin!.role).toBe(ChatParticipantRole.ADMIN);
  });

  it('should include tournament organizer', () => {
    const participants = buildParticipants(match as Match);
    const organizer = participants.find(p => p.id === 'creator-1');
    expect(organizer).toBeDefined();
    expect(organizer!.role).toBe(ChatParticipantRole.ADMIN);
  });

  it('should include home and away team captains', () => {
    const participants = buildParticipants(match as Match);
    const homeCap = participants.find(p => p.id === 'team-1-cap');
    const awayCap = participants.find(p => p.id === 'team-2-cap');
    expect(homeCap).toBeDefined();
    expect(homeCap!.role).toBe(ChatParticipantRole.CAPTAIN);
    expect(awayCap).toBeDefined();
    expect(awayCap!.role).toBe(ChatParticipantRole.CAPTAIN);
  });

  it('should use "organizer" when tournamentCreatorId is absent', () => {
    const noCreator = { ...match, tournamentCreatorId: undefined } as Match;
    const participants = buildParticipants(noCreator);
    const organizer = participants.find(p => p.id === 'organizer');
    expect(organizer).toBeDefined();
  });
});

// ── checkMatchAuthorization ────────────────────────────────

describe('checkMatchAuthorization', () => {
  const baseMatch: Partial<Match> = {
    homeTeamId: 'team-1',
    awayTeamId: 'team-2',
    tournamentCreatorId: 'creator-1',
  };

  const baseUser: User = {
    id: 'user-1',
    displayId: 'U001',
    name: 'Test',
    email: 'test@test.com',
    role: UserRole.PLAYER,
    status: UserStatus.ACTIVE,
    isEmailVerified: true,
    createdAt: new Date(),
  };

  it('should return false when currentUser is null', () => {
    expect(checkMatchAuthorization(null, baseMatch as Match)).toBe(false);
  });

  it('should return false when match is null', () => {
    expect(checkMatchAuthorization(baseUser, null)).toBe(false);
  });

  it('should return true for ADMIN regardless of team', () => {
    const admin = { ...baseUser, role: UserRole.ADMIN };
    expect(checkMatchAuthorization(admin, baseMatch as Match)).toBe(true);
  });

  it('should return true for home team player', () => {
    const player = { ...baseUser, teamId: 'team-1' };
    expect(checkMatchAuthorization(player, baseMatch as Match)).toBe(true);
  });

  it('should return true for away team player', () => {
    const player = { ...baseUser, teamId: 'team-2' };
    expect(checkMatchAuthorization(player, baseMatch as Match)).toBe(true);
  });

  it('should return true for player with joinedTeamIds containing home team', () => {
    const player = { ...baseUser, joinedTeamIds: ['team-1'] };
    expect(checkMatchAuthorization(player, baseMatch as Match)).toBe(true);
  });

  it('should return true for tournament creator', () => {
    const creator = { ...baseUser, id: 'creator-1' };
    expect(checkMatchAuthorization(creator, baseMatch as Match)).toBe(true);
  });

  it('should return false for non-participant', () => {
    const outsider = { ...baseUser, id: 'outsider', teamId: 'team-99' };
    expect(checkMatchAuthorization(outsider, baseMatch as Match)).toBe(false);
  });
});
