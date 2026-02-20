import { getBadgeType, getStatusLabel, getRoleLabel } from './users-list.utils';
import { User, UserRole, UserStatus, TeamRole } from '../../../../core/models/user.model';

// ── getBadgeType ────────────────────────────────────────────

describe('getBadgeType', () => {
  it('should return "success" for Active', () => {
    expect(getBadgeType(UserStatus.ACTIVE)).toBe('success');
  });

  it('should return "warning" for Pending', () => {
    expect(getBadgeType(UserStatus.PENDING)).toBe('warning');
  });

  it('should return "danger" for Suspended', () => {
    expect(getBadgeType(UserStatus.SUSPENDED)).toBe('danger');
  });

  it('should return "neutral" for unknown status', () => {
    expect(getBadgeType('Unknown')).toBe('neutral');
  });
});

// ── getStatusLabel ──────────────────────────────────────────

describe('getStatusLabel', () => {
  it('should return "نشط" for Active', () => {
    expect(getStatusLabel(UserStatus.ACTIVE)).toBe('نشط');
  });

  it('should return "معلق" for Pending', () => {
    expect(getStatusLabel(UserStatus.PENDING)).toBe('معلق');
  });

  it('should return "موقوف" for Suspended', () => {
    expect(getStatusLabel(UserStatus.SUSPENDED)).toBe('موقوف');
  });

  it('should return "غير معروف" for unknown status', () => {
    expect(getStatusLabel('Other')).toBe('غير معروف');
  });
});

// ── getRoleLabel ────────────────────────────────────────────

describe('getRoleLabel', () => {
  const baseUser: User = {
    id: '1',
    displayId: 'U001',
    name: 'Test',
    email: 'test@test.com',
    role: UserRole.PLAYER,
    status: UserStatus.ACTIVE,
    isEmailVerified: true,
    createdAt: new Date(),
  };

  it('should return "مسؤول" for Admin', () => {
    const admin = { ...baseUser, role: UserRole.ADMIN };
    expect(getRoleLabel(admin)).toBe('مسؤول');
  });

  it('should return "منشئ بطولة" for TournamentCreator', () => {
    const creator = { ...baseUser, role: UserRole.TOURNAMENT_CREATOR };
    expect(getRoleLabel(creator)).toBe('منشئ بطولة');
  });

  it('should return "لاعب" for regular Player', () => {
    expect(getRoleLabel(baseUser)).toBe('لاعب');
  });

  it('should return "قائد فريق" for Player with Captain teamRole', () => {
    const captain = { ...baseUser, role: UserRole.PLAYER, teamRole: TeamRole.CAPTAIN };
    expect(getRoleLabel(captain)).toBe('قائد فريق');
  });

  it('should return "لاعب" for Player with Member teamRole', () => {
    const member = { ...baseUser, role: UserRole.PLAYER, teamRole: TeamRole.MEMBER };
    expect(getRoleLabel(member)).toBe('لاعب');
  });
});
