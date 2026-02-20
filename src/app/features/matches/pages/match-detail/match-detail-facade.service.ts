import { Injectable, inject, ChangeDetectorRef, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MatchService } from '../../../../core/services/match.service';
import { MatchStore } from '../../../../core/stores/match.store';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { Match, MatchStatus } from '../../../../core/models/tournament.model';

@Injectable()
export class MatchDetailFacadeService {
    private matchService = inject(MatchService);
    private matchStore = inject(MatchStore);
    private uiFeedback = inject(UIFeedbackService);
    private cdr = inject(ChangeDetectorRef);

    // Schedule modal state
    showScheduleModal = signal(false);
    scheduleType: 'postpone' | 'reset' | 'schedule' = 'postpone';
    scheduleForm = { date: '', time: '' };

    // Cancel modal state
    showCancelModal = signal(false);
    cancelReason = '';

    // ==================== MATCH ACTIONS ====================

    async startMatch(match: Match | null): Promise<void> {
        if (!match) return;
        try {
            const updated = await firstValueFrom(this.matchService.startMatch(match.id));
            if (updated) this.matchStore.upsertMatch(updated);
            this.uiFeedback.success('تم البدء', 'انطلقت المباراة الآن! - الوضع المباشر');
            this.cdr.detectChanges();
        } catch {
            this.uiFeedback.error('فشل بدء المباراة', 'تعذّر بدء المباراة. يرجى المحاولة مرة أخرى.');
        }
    }

    async deleteEvent(match: Match | null, eventId: string): Promise<void> {
        if (!match) return;
        const confirmed = await firstValueFrom(this.uiFeedback.confirm(
            'حذف الحدث',
            'هل أنت متأكد من رغبتك في حذف هذا الحدث؟ ستتم استعادة الأهداف (إن وجدت) وتحديث إحصائيات المباراة.',
            'حذف الحدث',
            'danger'
        ));
        if (!confirmed) return;

        try {
            const updated: Match | null = await firstValueFrom(this.matchService.deleteMatchEvent(match.id, eventId));
            if (updated) this.matchStore.upsertMatch(updated);
            this.uiFeedback.success('تم الحذف', 'تم حذف الحدث وتحديث البيانات');
            this.cdr.detectChanges();
        } catch {
            this.uiFeedback.error('فشل الحذف', 'تعذّر حذف الحدث. يرجى المحاولة مرة أخرى.');
        }
    }

    // ==================== SCHEDULE MODAL ====================

    openSetScheduleModal(match: Match | null): void {
        this.scheduleType = 'schedule';
        if (match?.date) {
            const dt = new Date(match.date);
            this.scheduleForm.date = dt.toISOString().split('T')[0];
            this.scheduleForm.time = dt.toTimeString().substring(0, 5);
        }
        this.showScheduleModal.set(true);
    }

    openPostponeModal(): void {
        this.scheduleType = 'postpone';
        this.showScheduleModal.set(true);
    }

    openRescheduleModal(): void {
        this.scheduleType = 'reset';
        this.showScheduleModal.set(true);
    }

    closeScheduleModal(): void {
        this.showScheduleModal.set(false);
        this.scheduleForm = { date: '', time: '' };
    }

    async submitScheduleChange(match: Match | null): Promise<void> {
        if (!match || !this.scheduleForm.date || !this.scheduleForm.time) {
            this.uiFeedback.warning('تنبيه', 'يرجى اختيار التاريخ والوقت');
            return;
        }

        const newDate = new Date(`${this.scheduleForm.date}T${this.scheduleForm.time}`);
        const configs: Record<string, { update: Partial<Match>; title: string; msg: string }> = {
            postpone: {
                update: { date: newDate, status: MatchStatus.POSTPONED } as Partial<Match>,
                title: 'تم التأجيل',
                msg: 'تم تأجيل المباراة للموعد الجديد'
            },
            reset: {
                update: { date: newDate, status: MatchStatus.RESCHEDULED, homeScore: 0, awayScore: 0 } as Partial<Match>,
                title: 'تمت الإعادة',
                msg: 'تم إعادة المباراة وجدولتها في الموعد الجديد'
            },
            schedule: {
                update: { date: newDate } as Partial<Match>,
                title: 'تم بنجاح',
                msg: 'تم تحديد موعد اللقاء'
            }
        };

        const config = configs[this.scheduleType];
        try {
            const updated: Match | null = await firstValueFrom(this.matchService.updateMatch(match.id, config.update));
            if (updated) {
                this.matchStore.upsertMatch(updated);
                this.uiFeedback.success(config.title, config.msg);
            }
            this.closeScheduleModal();
            this.cdr.detectChanges();
        } catch (err: unknown) {
            const httpErr = err as { error?: { message?: string }; message?: string };
            this.uiFeedback.error('فشل التحديث', httpErr?.error?.message || httpErr?.message || 'تعذّر تحديث المباراة.');
        }
    }

    // ==================== CANCEL MODAL ====================

    openCancelModal(): void {
        this.showCancelModal.set(true);
    }

    closeCancelModal(): void {
        this.showCancelModal.set(false);
        this.cancelReason = '';
    }

    async submitCancellation(match: Match | null): Promise<void> {
        if (!match || !this.cancelReason.trim()) {
            this.uiFeedback.warning('تنبيه', 'يرجى إدخال سبب الإلغاء');
            return;
        }

        try {
            const success: boolean = await firstValueFrom(this.matchService.updateMatchStatus(match.id, MatchStatus.CANCELLED));
            if (success) {
                const updated = { ...match, status: MatchStatus.CANCELLED };
                this.matchStore.updateMatch(updated);
                this.uiFeedback.success('تم الإلغاء', 'تم إلغاء المباراة وإرسال إشعارات لجميع الأطراف');
            }
            this.closeCancelModal();
            this.cdr.detectChanges();
        } catch (err: unknown) {
            const httpErr = err as { error?: { message?: string }; message?: string };
            this.uiFeedback.error('فشل الإلغاء', httpErr?.error?.message || httpErr?.message || 'تعذّر إلغاء المباراة.');
        }
    }
}
