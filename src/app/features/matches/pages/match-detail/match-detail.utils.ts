import { MatchEventType, MatchStatus } from '../../../../core/models/tournament.model';
import { resolveStatus, StatusConfig } from '../../../../shared/utils/status-labels';

export function getEventColor(type: MatchEventType | string | undefined): string {
    const variant = resolveStatus('match-event', type as string).variant;
    const colorMap: Record<string, string> = {
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
        info: 'var(--color-info)',
        primary: 'var(--color-primary)',
        gold: 'var(--color-gold)',
        muted: 'var(--text-muted)'
    };
    return colorMap[variant as string] || 'var(--text-muted)';
}

export function getEventLabel(type: MatchEventType | string | undefined): string {
    return resolveStatus('match-event', type as string).label;
}

export function getStatusLabel(status: MatchStatus): string {
    return resolveStatus('match', status).label;
}

export function getStatusConfig(status: MatchStatus): StatusConfig {
    return resolveStatus('match', status);
}
