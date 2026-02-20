import { getEventColor, getEventLabel, getStatusLabel, getStatusConfig } from './match-detail.utils';
import { MatchEventType, MatchStatus } from '../../../../core/models/match.model';

// ── getEventColor ───────────────────────────────────────────

describe('getEventColor', () => {
  it('should return success color for Goal', () => {
    const color = getEventColor(MatchEventType.GOAL);
    expect(color).toBeTruthy();
    expect(typeof color).toBe('string');
  });

  it('should return warning color for YellowCard', () => {
    const color = getEventColor(MatchEventType.YELLOW_CARD);
    expect(color).toBeTruthy();
  });

  it('should return danger color for RedCard', () => {
    const color = getEventColor(MatchEventType.RED_CARD);
    expect(color).toBeTruthy();
  });

  it('should return a color for Penalty', () => {
    const color = getEventColor(MatchEventType.PENALTY);
    expect(color).toBeTruthy();
  });

  it('should return muted color for undefined event type', () => {
    const color = getEventColor(undefined);
    expect(color).toBeTruthy();
  });

  it('should return muted color for unknown event type', () => {
    const color = getEventColor('UNKNOWN_EVENT');
    expect(color).toBeTruthy();
  });
});

// ── getEventLabel ───────────────────────────────────────────

describe('getEventLabel', () => {
  it('should return "هدف" for Goal', () => {
    expect(getEventLabel(MatchEventType.GOAL)).toBe('هدف');
  });

  it('should return a label string for YellowCard', () => {
    const label = getEventLabel(MatchEventType.YELLOW_CARD);
    expect(label).toBeTruthy();
    expect(typeof label).toBe('string');
  });

  it('should return a label string for RedCard', () => {
    const label = getEventLabel(MatchEventType.RED_CARD);
    expect(label).toBeTruthy();
    expect(typeof label).toBe('string');
  });

  it('should return a label string for Penalty', () => {
    const label = getEventLabel(MatchEventType.PENALTY);
    expect(label).toBeTruthy();
    expect(typeof label).toBe('string');
  });

  it('should return a fallback label for undefined', () => {
    const label = getEventLabel(undefined);
    expect(label).toBeTruthy();
  });
});

// ── getStatusLabel ──────────────────────────────────────────

describe('getStatusLabel', () => {
  it('should return "قادمة" for Scheduled', () => {
    expect(getStatusLabel(MatchStatus.SCHEDULED)).toBe('قادمة');
  });

  it('should return "مباشر" for Live', () => {
    expect(getStatusLabel(MatchStatus.LIVE)).toBe('مباشر');
  });

  it('should return "منتهية" for Finished', () => {
    expect(getStatusLabel(MatchStatus.FINISHED)).toBe('منتهية');
  });

  it('should return "ملغاة" for Cancelled', () => {
    expect(getStatusLabel(MatchStatus.CANCELLED)).toBe('ملغاة');
  });

  it('should return "مؤجلة" for Postponed', () => {
    expect(getStatusLabel(MatchStatus.POSTPONED)).toBe('مؤجلة');
  });

  it('should return "معاد جدولتها" for Rescheduled', () => {
    expect(getStatusLabel(MatchStatus.RESCHEDULED)).toBe('معاد جدولتها');
  });
});

// ── getStatusConfig ─────────────────────────────────────────

describe('getStatusConfig', () => {
  it('should return config with label, variant, and icon for Scheduled', () => {
    const config = getStatusConfig(MatchStatus.SCHEDULED);
    expect(config.label).toBe('قادمة');
    expect(config.variant).toBe('info');
    expect(config.icon).toBe('schedule');
  });

  it('should return danger variant for Live', () => {
    const config = getStatusConfig(MatchStatus.LIVE);
    expect(config.variant).toBe('danger');
  });

  it('should return muted variant for Finished', () => {
    const config = getStatusConfig(MatchStatus.FINISHED);
    expect(config.variant).toBe('muted');
  });

  it('should return danger variant for Cancelled', () => {
    const config = getStatusConfig(MatchStatus.CANCELLED);
    expect(config.variant).toBe('danger');
  });

  it('should return warning variant for Postponed', () => {
    const config = getStatusConfig(MatchStatus.POSTPONED);
    expect(config.variant).toBe('warning');
  });

  it('should return info variant for Rescheduled', () => {
    const config = getStatusConfig(MatchStatus.RESCHEDULED);
    expect(config.variant).toBe('info');
  });
});
