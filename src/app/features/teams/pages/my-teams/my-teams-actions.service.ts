import { Injectable, Signal, WritableSignal, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TeamData, TeamPlayer } from '../../../../shared/components/team-detail';
import { TeamService } from '../../../../core/services/team.service';
import { Team, ApiTeamMatch, ApiTeamFinance } from '../../../../core/models/team.model';
import { AuthService } from '../../../../core/services/auth.service';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { TeamRequestService } from '../../../../core/services/team-request.service';
import { TeamJoinRequest } from '../../../../core/models/team-request.model';
import { TeamStore } from '../../../../core/stores/team.store';
import { AuthStore } from '../../../../core/stores/auth.store';
import { ContextNavigationService } from '../../../../core/navigation/context-navigation.service';
import { UserStatus } from '../../../../core/models/user.model';
import { convertToTeamData } from './my-teams.utils';

export interface TeamActionsState {
    teamData: WritableSignal<TeamData | null>;
    loading: WritableSignal<boolean>;
    pendingInvitations: WritableSignal<TeamJoinRequest[]>;
    isCaptain: Signal<boolean>;
    getCurrentUser: () => ReturnType<AuthService['getCurrentUser']>;
    setCurrentUser: (user: ReturnType<AuthService['getCurrentUser']>) => void;
    markForCheck: () => void;
    loadTeamData: () => Promise<void>;
    loadInvitations: () => Promise<void>;
}

/**
 * Handles team mutation actions (create, delete, edit, player management).
 * Split from MyTeamsFacadeService to reduce file size.
 */
@Injectable()
export class MyTeamsActionsService {
    private readonly teamService = inject(TeamService);
    private readonly authService = inject(AuthService);
    private readonly uiFeedback = inject(UIFeedbackService);
    private readonly teamRequestService = inject(TeamRequestService);
    private readonly teamStore = inject(TeamStore);
    private readonly authStore = inject(AuthStore);
    private readonly navService = inject(ContextNavigationService);

    // Internal state
    isAddingPlayer = false;
    creatingTeam = false;
    showCreateTeamForm = false;
    showCreateTeamModal = false;
    newTeamName = '';

    private state!: TeamActionsState;

    init(state: TeamActionsState): void {
        this.state = state;
    }

    async acceptInvite(requestId: string): Promise<void> {
        this.state.loading.set(true);
        this.state.pendingInvitations.set([]);

        try {
            const response = await firstValueFrom(this.teamRequestService.acceptRequest(requestId));
            this.uiFeedback.success('تمت الإضافة', 'أهلاً بك في فريقك الجديد!');

            const teamId = (response as { teamId: string }).teamId;
            if (teamId && typeof teamId === 'string') {
                const currentUser = this.state.getCurrentUser();
                if (currentUser) {
                    const updatedUser = { ...currentUser, teamId };
                    this.state.setCurrentUser(updatedUser);
                    this.authService.updateCurrentUser(updatedUser);
                }
                this.state.loadTeamData();
            }

            const updatedUser = await firstValueFrom(this.authService.refreshUserProfile());
            if (updatedUser?.teamId) {
                this.state.setCurrentUser(updatedUser);
                this.state.loadTeamData();
            }
        } catch (err: unknown) {
            this.state.loading.set(false);
            this.state.loadInvitations();
            const httpErr = err as { message?: string };
            if (httpErr?.message) {
                this.uiFeedback.error('فشل القبول', httpErr.message);
            }
        }
    }

    async rejectInvite(requestId: string): Promise<void> {
        try {
            await firstValueFrom(this.teamRequestService.rejectRequest(requestId));
            this.state.pendingInvitations.update(invites => invites.filter(i => i.id !== requestId));
            this.uiFeedback.success('تم الرفض', 'تم رفض الدعوة بنجاح');
        } catch { /* ignore */ }
    }

    selectTeam(team: Team): void {
        const existingTeam = this.teamStore.getTeamById(team.id);
        if (existingTeam) {
            this.teamStore.updateTeam(team);
        } else {
            this.teamStore.addTeam(team);
        }

        const converted = convertToTeamData(team);
        this.state.teamData.set(converted);

        if (team.players.some(p => p.id === this.state.getCurrentUser()?.id && p.teamRole === 'Captain')) {
            firstValueFrom(this.teamRequestService.getRequestsForMyTeam()).then(requests => {
                const current = this.state.teamData();
                if (current) {
                    this.state.teamData.set({ ...current, invitations: requests });
                }
            }).catch(() => { /* ignore */ });
        }
    }

    navigateToTeamDetail(teamId: string): void {
        this.navService.navigateTo(['team-management', teamId]);
    }

    async createNewTeam(teamName: string): Promise<void> {
        const currentUser = this.state.getCurrentUser();
        if (!currentUser) return;

        if (this.authStore.currentUser()?.status === UserStatus.PENDING) {
            this.uiFeedback.error('تنبيه', 'لا يمكنك إنشاء فريق قبل تفعيل حسابك من قبل الإدارة');
            return;
        }

        if (!teamName.trim()) {
            this.uiFeedback.warning('تنبيه', 'يرجى إدخال اسم الفريق');
            return;
        }

        this.creatingTeam = true;
        this.state.loading.set(true);

        try {
            const response = await firstValueFrom(this.teamService.createTeam(currentUser, teamName));
            const converted = convertToTeamData(response.team);
            this.state.teamData.set(converted);

            this.authService.updateCurrentUser(response.updatedUser);
            this.state.setCurrentUser(response.updatedUser);

            this.state.loadTeamData();

            this.creatingTeam = false;
            this.showCreateTeamForm = false;
            this.showCreateTeamModal = false;
            this.newTeamName = '';
            this.uiFeedback.success('مبروك!', `تم إنشاء فريق "${response.team.name}" بنجاح.`);
        } catch (err: unknown) {
            console.error('Error creating team:', err);
            const httpErr = err as { message?: string };
            this.uiFeedback.error('فشل الإنشاء', httpErr?.message || 'حدث خطأ أثناء إنشاء الفريق');
            this.creatingTeam = false;
            this.state.loading.set(false);
        }
    }

    handleTabChange(tab: string): void {
        if (!this.state.teamData()) return;

        queueMicrotask(async () => {
            const current = this.state.teamData();
            if (!current) return;

            try {
                switch (tab) {
                    case 'players': {
                        const players = await firstValueFrom(this.teamService.getTeamPlayers(current.id));
                        const updated: TeamData = {
                            ...current,
                            players: players.map((p) => ({
                                id: p.id,
                                name: p.name,
                                number: p.number || 0,
                                position: p.position || 'لاعب',
                                goals: p.goals || 0,
                                yellowCards: p.yellowCards || 0,
                                redCards: p.redCards || 0,
                                status: p.status || 'active'
                            }))
                        };
                        this.state.teamData.set(updated);
                        break;
                    }
                    case 'matches': {
                        const matches: ApiTeamMatch[] = await firstValueFrom(this.teamService.getTeamMatches(current.id));
                        const updated: TeamData = {
                            ...current,
                            matches: matches.map((m: ApiTeamMatch) => ({
                                id: m.id,
                                opponent: m.homeTeamId === current.id ? m.awayTeamName : m.homeTeamName,
                                date: new Date(m.date),
                                teamScore: m.homeTeamId === current.id ? m.homeScore : m.awayScore,
                                opponentScore: m.homeTeamId === current.id ? m.awayScore : m.homeScore,
                                status: m.status,
                                type: 'مباراة بطولة'
                            }))
                        };
                        this.state.teamData.set(updated);
                        break;
                    }
                    case 'finances': {
                        const finances: ApiTeamFinance[] = await firstValueFrom(this.teamService.getTeamFinancials(current.id));
                        const updated: TeamData = {
                            ...current,
                            finances: finances.map((f: ApiTeamFinance) => ({
                                id: f.tournamentId || 'unknown',
                                title: f.tournamentName || 'تسجيل بطولة',
                                category: 'Tournament Registration',
                                amount: 0,
                                date: new Date(f.registeredAt),
                                status: f.status,
                                type: 'expense'
                            }))
                        };
                        this.state.teamData.set(updated);
                        break;
                    }
                    case 'requests': {
                        if (this.state.isCaptain()) {
                            const requests = await firstValueFrom(this.teamRequestService.getRequestsForMyTeam());
                            this.state.teamData.set({ ...current, invitations: requests });
                        }
                        break;
                    }
                }
            } catch { /* ignore */ }
        });
    }

    async handleRespondRequest(event: { request: TeamJoinRequest, approve: boolean }): Promise<void> {
        const { request, approve } = event;
        const currentData = this.state.teamData();
        if (!currentData) return;

        try {
            await firstValueFrom(this.teamRequestService.respondToRequest(currentData.id, request.id, approve));
            this.uiFeedback.success(approve ? 'تم القبول' : 'تم الرفض', 'تم تحديث حالة الطلب بنجاح');
            const requests = await firstValueFrom(this.teamRequestService.getRequestsForMyTeam());
            const latest = this.state.teamData();
            if (latest) {
                this.state.teamData.set({ ...latest, invitations: requests });
            }
            if (approve) {
                this.state.loadTeamData();
            }
        } catch (err: unknown) {
            const httpErr = err as { error?: { message?: string } };
            this.uiFeedback.error('فشل المعالجة', httpErr?.error?.message || 'حدث خطأ أثناء معالجة الطلب');
        }
    }

    async handleEditName(newName: string): Promise<void> {
        const current = this.state.teamData();
        if (!current || !newName.trim()) return;

        try {
            const updated = await firstValueFrom(this.teamService.updateTeam({ id: current.id, name: newName } as Partial<Team>));
            this.state.teamData.set({ ...current, name: updated.name });
            this.uiFeedback.success('تم التحديث', 'تم تغيير اسم الفريق بنجاح');
        } catch {
            this.uiFeedback.error('فشل التحديث', 'تعذّر تغيير اسم الفريق. يرجى المحاولة مرة أخرى.');
        }
    }

    async onAddPlayerClick(playerId: string): Promise<void> {
        const current = this.state.teamData();
        if (!current || !this.state.getCurrentUser()) return;

        this.isAddingPlayer = true;
        try {
            const response: { playerName: string } = await firstValueFrom(this.teamService.invitePlayerByDisplayId(current.id, playerId));
            this.uiFeedback.success('تم إرسال الدعوة', `تم إرسال دعوة للانضمام للبطل "${response.playerName}" بنجاح.`);
            this.showCreateTeamForm = false;
        } catch (err: unknown) {
            const httpErr = err as { error?: { message?: string }, message?: string };
            this.uiFeedback.error('فشل الإضافة', httpErr?.error?.message || httpErr?.message || 'لم يتم العثور على لاعب بهذا الرقم أو أنه مسجل في فريق آخر');
        } finally {
            this.isAddingPlayer = false;
        }
    }

    async handlePlayerAction(event: { player: TeamPlayer, action: 'activate' | 'deactivate' | 'ban' | 'remove' }): Promise<void> {
        const current = this.state.teamData();
        if (!this.state.isCaptain() || !current) return;

        const { player, action } = event;
        const config = {
            activate: { title: 'تفعيل اللاعب', message: `هل أنت متأكد من تفعيل "${player.name}"؟`, btn: 'تفعيل', type: 'info' as const },
            deactivate: { title: 'تعليق اللاعب', message: `هل أنت متأكد من تعليق "${player.name}"؟`, btn: 'تعليق', type: 'warning' as const },
            ban: { title: 'حظر اللاعب', message: `هل أنت متأكد من حظر "${player.name}" نهائياً؟`, btn: 'حظر', type: 'danger' as const },
            remove: { title: 'استبعاد لاعب', message: `هل أنت متأكد من استبعاد "${player.name}" من الفريق؟`, btn: 'استبعاد', type: 'danger' as const }
        };

        const { title, message, btn, type } = config[action];
        const confirmed = await firstValueFrom(this.uiFeedback.confirm(title, message, btn, type));
        if (!confirmed) return;

        if (action === 'remove') {
            try {
                await firstValueFrom(this.teamService.removePlayer(current.id, player.id.toString()));
                this.state.teamData.set({
                    ...current,
                    players: current.players.filter((p) => String(p.id) !== String(player.id))
                });
                this.uiFeedback.success('تم الاستبعاد', 'تم إزالة اللاعب من الفريق');
            } catch {
                this.uiFeedback.error('فشل الاستبعاد', 'تعذّر إزالة اللاعب من الفريق. يرجى المحاولة مرة أخرى.');
            }
        } else {
            this.uiFeedback.success('تم التحديث', 'تمت العملية بنجاح');
        }
    }

    async handleDeleteTeam(): Promise<void> {
        const current = this.state.teamData();
        if (!this.state.isCaptain() || !current) return;

        const confirmed = await firstValueFrom(this.uiFeedback.confirm(
            'حذف الفريق',
            'هل أنت متأكد من حذف هذا الفريق؟ سيتم أرشفة الفريق وإلغاء عضوية جميع اللاعبين.',
            'حذف نهائي',
            'danger'
        ));
        if (!confirmed) return;

        try {
            await firstValueFrom(this.teamService.deleteTeam(current.id));
            this.uiFeedback.success('تم الحذف', 'تم حذف الفريق بنجاح');
            await firstValueFrom(this.authService.refreshUserProfile());
            this.state.setCurrentUser(this.authService.getCurrentUser());
            this.state.teamData.set(null);
            this.state.loadInvitations();
        } catch (err: unknown) {
            const httpErr = err as { error?: { message?: string } };
            this.uiFeedback.error('فشل الحذف', httpErr?.error?.message || 'حدث خطأ أثناء محاولة حذف الفريق');
        }
    }
}
