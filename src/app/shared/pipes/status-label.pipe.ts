import { Pipe, PipeTransform } from '@angular/core';
import { TournamentStatus, MatchStatus } from '../../core/models/tournament.model';

/**
 * StatusLabelPipe - Transforms status enums to human-readable Arabic labels.
 * Supports both TournamentStatus and MatchStatus enums.
 * 
 * Usage:
 *   {{ tournament.status | statusLabel }}
 *   {{ match.status | statusLabel }}
 */
@Pipe({
    name: 'statusLabel',
    standalone: true
})
export class StatusLabelPipe implements PipeTransform {

    private readonly tournamentLabels: Record<TournamentStatus, string> = {
        [TournamentStatus.DRAFT]: 'مسودة',
        [TournamentStatus.REGISTRATION_OPEN]: 'التسجيل مفتوح',
        [TournamentStatus.REGISTRATION_CLOSED]: 'التسجيل مغلق',
        [TournamentStatus.ACTIVE]: 'جارية',
        [TournamentStatus.WAITING_FOR_OPENING_MATCH_SELECTION]: 'في انتظار اختيار مباراة الافتتاح',
        [TournamentStatus.COMPLETED]: 'مكتملة',
        [TournamentStatus.CANCELLED]: 'ملغية',
        [TournamentStatus.MANUAL_QUALIFICATION_PENDING]: 'في انتظار تحديد المتأهلين',
        [TournamentStatus.QUALIFICATION_CONFIRMED]: 'تم تأكيد التأهل'
    };

    private readonly matchLabels: Record<MatchStatus, string> = {
        [MatchStatus.SCHEDULED]: 'قادمة',
        [MatchStatus.LIVE]: 'مباشر',
        [MatchStatus.HALFTIME]: 'استراحة',
        [MatchStatus.FINISHED]: 'منتهية',
        [MatchStatus.CANCELLED]: 'ملغية',
        [MatchStatus.POSTPONED]: 'مؤجلة',
        [MatchStatus.RESCHEDULED]: 'معاد جدولتها'
    };

    transform(value: TournamentStatus | MatchStatus | string): string {
        // Check TournamentStatus first
        if (this.isTournamentStatus(value)) {
            return this.tournamentLabels[value] || value;
        }

        // Check MatchStatus
        if (this.isMatchStatus(value)) {
            return this.matchLabels[value] || value;
        }

        // Fallback for string values (case-insensitive matching)
        const normalizedValue = value.toLowerCase();

        // Try tournament status
        const tournamentKey = Object.values(TournamentStatus).find(
            s => s.toLowerCase() === normalizedValue
        );
        if (tournamentKey) {
            return this.tournamentLabels[tournamentKey as TournamentStatus];
        }

        // Try match status
        const matchKey = Object.values(MatchStatus).find(
            s => s.toLowerCase() === normalizedValue
        );
        if (matchKey) {
            return this.matchLabels[matchKey as MatchStatus];
        }

        return value;
    }

    private isTournamentStatus(value: string): value is TournamentStatus {
        return Object.values(TournamentStatus).includes(value as TournamentStatus);
    }

    private isMatchStatus(value: string): value is MatchStatus {
        return Object.values(MatchStatus).includes(value as MatchStatus);
    }
}
