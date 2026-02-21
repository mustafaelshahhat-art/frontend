import { Injectable, DestroyRef, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { TournamentService } from '../../../core/services/tournament.service';
import { TournamentStore } from '../../../core/stores/tournament.store';
import { MatchStore } from '../../../core/stores/match.store';
import { UIFeedbackService } from '../../../shared/services/ui-feedback.service';
import { ContextNavigationService } from '../../../core/navigation/context-navigation.service';
import { Tournament, Match, TournamentStatus, TeamRegistration } from '../../../core/models/tournament.model';
import { TournamentDetailStore } from './tournament-detail.store';

/**
 * Handles all mutation actions for the tournament detail page.
 * Provided at the component level alongside TournamentDetailStore.
 */
@Injectable()
export class TournamentDetailActions {
    private readonly store = inject(TournamentDetailStore);
    private readonly tournamentService = inject(TournamentService);
    private readonly tournamentStore = inject(TournamentStore);
    private readonly matchStore = inject(MatchStore);
    private readonly uiFeedback = inject(UIFeedbackService);
    private readonly navService = inject(ContextNavigationService);

    async toggleStatus(destroyRef: DestroyRef): Promise<void> {
        const t = this.store.tournament();
        if (!t) return;

        this.store.isLoading.set(true);

        try {
            let updated: Tournament;
            if (t.status === TournamentStatus.DRAFT) {
                updated = await firstValueFrom(
                    this.tournamentService.updateTournament(t.id, { status: TournamentStatus.REGISTRATION_OPEN })
                );
                this.tournamentStore.updateTournament(updated);
                this.uiFeedback.success('تم التحديث', 'تم فتح باب التسجيل بنجاح');
            } else if (t.status === TournamentStatus.REGISTRATION_OPEN) {
                updated = await firstValueFrom(
                    this.tournamentService.closeRegistration(t.id)
                );
                this.tournamentStore.updateTournament(updated);
                this.uiFeedback.success('تم التحديث', 'تم إغلاق التسجيل بنجاح');
            } else {
                updated = await firstValueFrom(
                    this.tournamentService.updateTournament(t.id, { status: TournamentStatus.REGISTRATION_OPEN })
                );
                this.tournamentStore.updateTournament(updated);
                this.uiFeedback.success('تم التحديث', `تم تغيير حالة البطولة`);
            }
            this.store.isLoading.set(false);
        } catch (err: unknown) {
            this.store.isLoading.set(false);
            const httpErr = err as { error?: { message?: string } };
            if (t.status === TournamentStatus.DRAFT) {
                this.uiFeedback.error('فشل فتح التسجيل', httpErr.error?.message || 'تعذّر فتح باب التسجيل.');
            } else if (t.status === TournamentStatus.REGISTRATION_OPEN) {
                this.uiFeedback.error('فشل إغلاق التسجيل', httpErr.error?.message || 'تعذّر إغلاق باب التسجيل.');
            } else {
                this.uiFeedback.error('فشل تغيير الحالة', httpErr.error?.message || 'تعذّر تغيير حالة البطولة.');
            }
        }
    }

    async generateMatches(destroyRef: DestroyRef): Promise<void> {
        const t = this.store.tournament();
        if (!t) return;

        this.store.isGeneratingMatches.set(true);
        try {
            await firstValueFrom(this.tournamentService.generateMatches(t.id));
            this.store.isGeneratingMatches.set(false);
            this.uiFeedback.success('تم بنجاح', 'تم توليد جدول المباريات بنجاح.');
            this.store.reload(destroyRef);
        } catch (err: unknown) {
            this.store.isGeneratingMatches.set(false);
            const httpErr = err as { error?: { message?: string } };
            this.uiFeedback.error('فشل توليد الجدول', httpErr.error?.message || 'تعذّر توليد المباريات.');
        }
    }

    async startTournament(destroyRef: DestroyRef): Promise<void> {
        const t = this.store.tournament();
        if (!t) return;

        const confirmed = await firstValueFrom(this.uiFeedback.confirm(
            'بدء البطولة',
            `هل أنت متأكد من بدء "${t.name}"؟ بمجرد البدء، لن تتمكن من تعديل الجدول.`,
            'تأكيد البدء',
            'info'
        ));
        if (!confirmed) return;

        this.store.isLoading.set(true);
        try {
            const updated = await firstValueFrom(this.tournamentService.startTournament(t.id));
            this.tournamentStore.updateTournament(updated);
            this.store.isLoading.set(false);
            this.uiFeedback.success('تم بنجاح', 'تم بدء البطولة بنجاح');
            this.store.reload(destroyRef);
        } catch (err: unknown) {
            this.store.isLoading.set(false);
            const httpErr = err as { error?: { message?: string } };
            this.uiFeedback.error('فشل بدء البطولة', httpErr.error?.message || 'تعذّر بدء البطولة.');
        }
    }

    async resetSchedule(destroyRef: DestroyRef): Promise<void> {
        const t = this.store.tournament();
        if (!t) return;

        const confirmed = await firstValueFrom(this.uiFeedback.confirm(
            'حذف الجدولة وتصفير القرعة',
            'هل أنت متأكد من حذف جميع المباريات والقرعة الحالية؟',
            'حذف الجدولة',
            'danger'
        ));
        if (!confirmed) return;

        this.store.isLoading.set(true);
        try {
            await firstValueFrom(this.tournamentService.resetSchedule(t.id));
            this.uiFeedback.success('تم الحذف', 'تم حذف الجدول بنجاح. يمكنك الآن إعادة الجدولة.');
            this.matchStore.clearTournamentMatches(t.id);
            this.store.reload(destroyRef);
        } catch (err: unknown) {
            this.store.isLoading.set(false);
            const httpErr = err as { error?: { message?: string } };
            this.uiFeedback.error('فشل حذف الجدول', httpErr.error?.message || 'تعذّر حذف جدول المباريات.');
        }
    }

    async deleteTournament(): Promise<void> {
        const t = this.store.tournament();
        if (!t) return;

        const confirmed = await firstValueFrom(this.uiFeedback.confirm(
            'حذف البطولة',
            `هل أنت متأكد من حذف بطولة "${t.name}"؟ هذا الإجراء لا يمكن التراجع عنه.`,
            'حذف نهائي',
            'danger'
        ));
        if (!confirmed) return;

        this.store.isLoading.set(true);
        try {
            await firstValueFrom(this.tournamentService.deleteTournament(t.id));
            this.uiFeedback.success('تم الحذف', 'تم حذف البطولة بنجاح');
            this.navService.navigateTo('tournaments');
        } catch (err: unknown) {
            this.store.isLoading.set(false);
            const httpErr = err as { error?: { message?: string } };
            this.uiFeedback.error('فشل الحذف', httpErr.error?.message || 'تعذّر حذف البطولة.');
        }
    }

    async withdrawTeam(destroyRef: DestroyRef): Promise<void> {
        const t = this.store.tournament();
        const reg = this.store.myRegistration();
        if (!t || !reg) return;

        const confirmed = await firstValueFrom(this.uiFeedback.confirm(
            'انسحاب من البطولة',
            `هل أنت متأكد من الانسحاب من بطولة ${t.name}؟`,
            'تأكيد الانسحاب',
            'danger'
        ));
        if (!confirmed) return;

        try {
            await firstValueFrom(this.tournamentService.withdrawTeam(t.id, reg.teamId));
            this.uiFeedback.success('تم الانسحاب', 'تم سحب فريقك من البطولة بنجاح');
            this.store.reload(destroyRef);
        } catch (err: unknown) {
            const httpErr = err as { error?: { message?: string } };
            this.uiFeedback.error('فشل الانسحاب', httpErr.error?.message || 'تعذّر الانسحاب.');
        }
    }

    registerTeam(): void {
        this.store.isRegisterModalVisible.set(true);
    }

    closeRegisterModal(): void {
        this.store.isRegisterModalVisible.set(false);
    }

    onRegistrationSuccess(registration: TeamRegistration): void {
        this.store.isRegisterModalVisible.set(false);
        // Immediately update the tournament store with the new registration
        const tournamentId = this.store.tournamentId();
        if (tournamentId && registration) {
            this.tournamentStore.updateRegistration(tournamentId, registration);
        }
    }

    selectOpeningMatch(): void {
        const t = this.store.tournament();
        const matches = this.store.tournamentMatches();
        if (!t || matches.length > 0) {
            this.uiFeedback.warning('تنبيه', 'لا يمكن تعديل مباراة الافتتاح بعد توليد الجدول.');
            return;
        }
        this.store.isOpeningMatchModalVisible.set(true);
    }

    closeOpeningMatchModal(): void {
        this.store.isOpeningMatchModalVisible.set(false);
    }

    async onOpeningMatchSelected(event: { homeTeamId: string; awayTeamId: string }, destroyRef: DestroyRef): Promise<void> {
        const t = this.store.tournament();
        if (!t) return;

        this.store.isLoading.set(true);
        try {
            const response = await firstValueFrom(
                this.tournamentService.setOpeningMatch(t.id, event.homeTeamId, event.awayTeamId)
            );
            this.store.isOpeningMatchModalVisible.set(false);
            const matches = response.matches;
            if (matches?.length) {
                matches.forEach((m: Match) => {
                    if (!this.matchStore.getMatchById(m.id)) this.matchStore.addMatch(m);
                    else this.matchStore.updateMatch(m);
                });
                this.uiFeedback.success('تم بنجاح', `تم تحديد الافتتاح وتوليد ${matches.length} مباراة.`);
            } else {
                this.uiFeedback.success('تم بنجاح', 'تم تحديد مباراة الافتتاح بنجاح.');
            }
            setTimeout(() => {
                this.store.reload(destroyRef);
                this.store.isLoading.set(false);
            }, 1000);
        } catch (err: unknown) {
            this.store.isOpeningMatchModalVisible.set(false);
            this.store.isLoading.set(false);
            const httpErr = err as { error?: { message?: string } };
            this.uiFeedback.error('فشل الافتتاحية', httpErr.error?.message || 'تعذّر تحديد مباراة الافتتاح.');
        }
    }

    async emergencyStart(): Promise<void> {
        const t = this.store.tournament();
        if (!t) return;

        const confirmed = await firstValueFrom(this.uiFeedback.confirm(
            '⚠️ إجراء طارئ: بدء البطولة',
            `هل أنت متأكد من فرض بدء بطولة "${t.name}"؟`,
            'تأكيد البدء الطارئ',
            'danger'
        ));
        if (!confirmed) return;

        this.store.isLoading.set(true);
        try {
            const updated = await firstValueFrom(this.tournamentService.emergencyStart(t.id));
            this.tournamentStore.upsertTournament(updated);
            this.uiFeedback.success('تم التدخل بنجاح', 'تم تغيير حالة البطولة إلى نشطة');
            this.store.isLoading.set(false);
        } catch (err: unknown) {
            this.store.isLoading.set(false);
            const httpErr = err as { error?: { message?: string } };
            this.uiFeedback.error('فشل البدء الطارئ', httpErr.error?.message || 'تعذّر تنفيذ البدء الطارئ.');
        }
    }

    async emergencyEnd(): Promise<void> {
        const t = this.store.tournament();
        if (!t) return;

        const confirmed = await firstValueFrom(this.uiFeedback.confirm(
            '⚠️ إجراء طارئ: إنهاء البطولة',
            `هل أنت متأكد من فرض إنهاء بطولة "${t.name}"؟`,
            'تأكيد الإنهاء الطارئ',
            'danger'
        ));
        if (!confirmed) return;

        this.store.isLoading.set(true);
        try {
            const updated = await firstValueFrom(this.tournamentService.emergencyEnd(t.id));
            this.tournamentStore.upsertTournament(updated);
            this.uiFeedback.success('تم التدخل بنجاح', 'تم إنهاء البطولة بنجاح');
            this.store.isLoading.set(false);
        } catch (err: unknown) {
            this.store.isLoading.set(false);
            const httpErr = err as { error?: { message?: string } };
            this.uiFeedback.error('فشل الإنهاء الطارئ', httpErr.error?.message || 'تعذّر تنفيذ الإنهاء الطارئ.');
        }
    }
}
