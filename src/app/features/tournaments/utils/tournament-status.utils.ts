/**
 * PERF-FIX F4: Extracted tournament status helpers from tournament-detail component.
 * Pure functions — reusable across any tournament-related component.
 */
import { TournamentStatus } from '../../../core/models/tournament.model';

type BadgeVariant = 'primary' | 'gold' | 'danger' | 'info' | 'warning' | 'success' | 'muted' | 'neutral' | 'live';

const TOURNAMENT_STATUS_LABELS: Record<TournamentStatus, string> = {
    [TournamentStatus.DRAFT]: 'مسودة',
    [TournamentStatus.REGISTRATION_OPEN]: 'التسجيل مفتوح',
    [TournamentStatus.REGISTRATION_CLOSED]: 'التسجيل مغلق',
    [TournamentStatus.ACTIVE]: 'جارية الآن',
    [TournamentStatus.WAITING_FOR_OPENING_MATCH_SELECTION]: 'بانتظار اختيار الافتتاح',
    [TournamentStatus.COMPLETED]: 'منتهية',
    [TournamentStatus.CANCELLED]: 'ملغاة',
    [TournamentStatus.MANUAL_QUALIFICATION_PENDING]: 'بانتظار تحديد المتأهلين',
    [TournamentStatus.QUALIFICATION_CONFIRMED]: 'تم تأكيد التأهل'
};

const REG_STATUS_LABELS: Record<string, string> = {
    PendingPaymentReview: 'قيد المراجعة',
    Approved: 'مؤكد',
    Rejected: 'مرفوض',
    Eliminated: 'مقصى',
    Withdrawn: 'منسحب'
};

const REG_STATUS_TYPES: Record<string, BadgeVariant> = {
    PendingPaymentReview: 'info',
    Approved: 'success',
    Rejected: 'danger',
    Eliminated: 'danger',
    Withdrawn: 'neutral'
};

export function getTournamentStatusLabel(status: TournamentStatus | undefined): string {
    if (!status) return '';
    return TOURNAMENT_STATUS_LABELS[status] ?? '';
}

export function getRegStatusLabel(status: string): string {
    return REG_STATUS_LABELS[status] ?? status;
}

export function getRegStatusType(status: string): BadgeVariant {
    return REG_STATUS_TYPES[status] ?? 'neutral';
}
