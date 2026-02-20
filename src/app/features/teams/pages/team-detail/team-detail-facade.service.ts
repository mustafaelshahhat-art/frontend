import { Injectable, inject, WritableSignal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { TeamService } from '../../../../core/services/team.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TeamStore } from '../../../../core/stores/team.store';
import { MatchService } from '../../../../core/services/match.service';
import { MatchStore } from '../../../../core/stores/match.store';
import { TeamRequestService } from '../../../../core/services/team-request.service';
import { Team } from '../../../../core/models/team.model';
import { TeamPlayer } from '../../../../shared/components/team-detail';

/**
 * Facade service encapsulating team-detail action methods.
 * Provided at the component level so it shares the component's DestroyRef.
 */
@Injectable()
export class TeamDetailFacade {
    private readonly teamService = inject(TeamService);
    private readonly uiFeedback = inject(UIFeedbackService);
    private readonly authService = inject(AuthService);
    private readonly teamStore = inject(TeamStore);
    private readonly matchService = inject(MatchService);
    private readonly matchStore = inject(MatchStore);
    private readonly teamRequestService = inject(TeamRequestService);

    async deleteTeam(teamId: string, onSuccess: () => void): Promise<void> {
        const confirmed = await firstValueFrom(this.uiFeedback.confirm(
            'حذف الفريق',
            'هل أنت متأكد من حذف هذا الفريق؟ سيتم أرشفة الفريق وإلغاء عضوية جميع اللاعبين.',
            'حذف نهائي',
            'danger'
        ));
        if (!confirmed) return;

        try {
            await firstValueFrom(this.teamService.deleteTeam(teamId));
            this.teamStore.removeTeam(teamId);
            await firstValueFrom(this.authService.refreshUserProfile());
            this.uiFeedback.success('تم الحذف', 'تم حذف الفريق بنجاح');
            onSuccess();
        } catch (err: unknown) {
            const httpErr = err as { error?: { message?: string } };
            this.uiFeedback.error('فشل الحذف', httpErr?.error?.message || 'تعذّر حذف الفريق. يرجى المحاولة مرة أخرى.');
        }
    }

    async addPlayer(teamId: string, displayId: string, isInviteLoading: WritableSignal<boolean>): Promise<void> {
        isInviteLoading.set(true);
        try {
            const response: { playerName: string } = await firstValueFrom(this.teamService.invitePlayerByDisplayId(teamId, displayId));
            this.uiFeedback.success('تم إرسال الدعوة', `تم إرسال دعوة للانضمام للبطل "${response.playerName}" بنجاح.`);
        } catch (err: unknown) {
            const httpErr = err as { error?: { message?: string }; message?: string };
            this.uiFeedback.error('فشل الإضافة', httpErr?.error?.message || httpErr?.message || 'لم يتم العثور على لاعب بهذا الرقم أو أنه مسجل في فريق آخر');
        } finally {
            isInviteLoading.set(false);
        }
    }

    async addGuestPlayer(
        teamId: string,
        event: { name: string; number?: number; position?: string },
        isInviteLoading: WritableSignal<boolean>,
        onReload: () => void
    ): Promise<void> {
        isInviteLoading.set(true);
        try {
            await firstValueFrom(this.teamService.addGuestPlayer(teamId, event.name, event.number, event.position));
            this.uiFeedback.success('تمت الإضافة', `تم إضافة اللاعب "${event.name}" للفريق بنجاح.`);
            onReload();
        } catch (err: unknown) {
            const httpErr = err as { error?: { message?: string }; message?: string };
            this.uiFeedback.error('فشل الإضافة', httpErr?.error?.message || httpErr?.message || 'فشل في إضافة اللاعب');
        } finally {
            isInviteLoading.set(false);
        }
    }

    async playerAction(teamId: string, event: { player: TeamPlayer; action: string }, onReload: () => void): Promise<void> {
        const { player, action } = event;
        const config = {
            activate: { title: 'تفعيل اللاعب', message: `هل أنت متأكد من تفعيل اللاعب "${player.name}"؟`, btn: 'تفعيل الآن', type: 'info' as const },
            deactivate: { title: 'تعطيل اللاعب', message: `هل أنت متأكد من تعطيل اللاعب "${player.name}"؟`, btn: 'تعطيل اللاعب', type: 'danger' as const },
            ban: { title: 'حظر اللاعب', message: `هل أنت متأكد من حظر اللاعب "${player.name}"؟`, btn: 'حظر نهائي', type: 'danger' as const },
            remove: { title: 'إزالة اللاعب', message: `هل أنت متأكد من إزالة اللاعب "${player.name}" من الفريق؟`, btn: 'إزالة الآن', type: 'danger' as const }
        };

        const { title, message, btn, type } = config[action as keyof typeof config];
        const confirmed = await firstValueFrom(this.uiFeedback.confirm(title, message, btn, type));
        if (!confirmed) return;

        try {
            if (action === 'remove') {
                await firstValueFrom(this.teamService.removePlayer(teamId, player.id.toString()));
                this.uiFeedback.success('تم الحذف', 'تم إزالة اللاعب من الفريق');
                onReload();
            } else {
                this.uiFeedback.info('قريباً', 'هذه الميزة غير مفعلة حالياً');
            }
        } catch {
            this.uiFeedback.error('فشل الإزالة', 'تعذّر إزالة اللاعب من الفريق. يرجى المحاولة مرة أخرى.');
        }
    }

    async disableTeam(teamId: string, onReload: () => void): Promise<void> {
        try {
            await firstValueFrom(this.teamService.disableTeam(teamId));
            this.uiFeedback.success('تم التعطيل', 'تم تعطيل الفريق وانسحابه من أي بطولة حالية');
            onReload();
        } catch {
            this.uiFeedback.error('فشل التعطيل', 'تعذّر تعطيل الفريق. يرجى المحاولة مرة أخرى.');
        }
    }

    async activateTeam(teamId: string, onReload: () => void): Promise<void> {
        try {
            await firstValueFrom(this.teamService.activateTeam(teamId));
            this.uiFeedback.success('تم التفعيل', 'تم إعادة تفعيل الفريق بنجاح');
            onReload();
        } catch {
            this.uiFeedback.error('فشل التفعيل', 'تعذّر تفعيل الفريق. يرجى المحاولة مرة أخرى.');
        }
    }

    async editName(teamId: string, newName: string): Promise<void> {
        try {
            const updated = await firstValueFrom(this.teamService.updateTeam({ id: teamId, name: newName } as Partial<Team>));
            this.teamStore.upsertTeam(updated);
            this.uiFeedback.success('تم التحديث', 'تم تغيير اسم الفريق بنجاح');
        } catch {
            this.uiFeedback.error('فشل التحديث', 'تعذّر تغيير اسم الفريق. يرجى المحاولة مرة أخرى.');
        }
    }

    async respondToRequest(teamId: string, requestId: string, approve: boolean, onReload: () => void): Promise<void> {
        try {
            await firstValueFrom(this.teamRequestService.respondToRequest(teamId, requestId, approve));
            this.uiFeedback.success(approve ? 'تم القبول' : 'تم الرفض', 'تم تحديث حالة الطلب بنجاح');
            onReload();
        } catch (err: unknown) {
            const httpErr = err as { error?: { message?: string } };
            this.uiFeedback.error('فشل المعالجة', httpErr?.error?.message || 'حدث خطأ أثناء معالجة الطلب');
        }
    }

    async refreshTabData(teamId: string, tab: string): Promise<void> {
        try {
            switch (tab) {
                case 'players': {
                    const players = await firstValueFrom(this.teamService.getTeamPlayers(teamId));
                    const team = this.teamStore.getTeamById(teamId);
                    if (team) this.teamStore.updateTeam({ ...team, players });
                    break;
                }
                case 'matches': {
                    const matches = await firstValueFrom(this.matchService.getMatchesByTeam(teamId));
                    matches.forEach(m => {
                        if (this.matchStore.getMatchById(m.id)) this.matchStore.updateMatch(m);
                        else this.matchStore.addMatch(m);
                    });
                    break;
                }
            }
        } catch { /* ignore */ }
    }
}
