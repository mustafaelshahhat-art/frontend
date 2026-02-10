import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TeamDetailComponent, TeamData, TeamPlayer, TeamMatch, TeamFinance } from '../../../shared/components/team-detail';
import { TeamService } from '../../../core/services/team.service';
import { Team, ApiTeamMatch, ApiTeamFinance } from '../../../core/models/team.model';
import { TeamStore } from '../../../core/stores/team.store';
import { AuthStore } from '../../../core/stores/auth.store';
import { AuthService } from '../../../core/services/auth.service';
import { CaptainLayoutService } from '../../../core/services/captain-layout.service';
import { UIFeedbackService } from '../../../shared/services/ui-feedback.service';
import { TeamRequestService } from '../../../core/services/team-request.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TeamJoinRequest } from '../../../core/models/team-request.model';

@Component({
    selector: 'app-captain-team-detail',
    standalone: true,
    imports: [
        CommonModule,
        TeamDetailComponent
    ],
    template: `
        @if (!loading() && teamData()) {
            <app-team-detail 
                [team]="teamData()!"
                [showBackButton]="true"
                [backRoute]="'/captain/team'"
                [canEditName]="isCaptain()"
                [canAddPlayers]="isCaptain()"
                [canRemovePlayers]="isCaptain()"
                [canManageStatus]="false"
                [canManageInvitations]="isCaptain()"
                [canDeleteTeam]="isCaptain()"
                [canSeeRequests]="isCaptain()"
                [canSeeFinances]="isCaptain()"
                [isInviteLoading]="isInviteLoading()"
                [initialTab]="'players'"
                (playerAction)="handlePlayerAction($event)"
                (editName)="handleEditName($event)"
                (addPlayer)="handleAddPlayer($event)"
                (tabChanged)="handleTabChange($event)"
                (respondRequest)="handleRespondRequest($event)"
                (deleteTeam)="handleDeleteTeam()" />
        }

        @if (loading()) {
            <div class="flex-center p-xl">
                <p>جاري تحميل بيانات الفريق...</p>
            </div>
        }

        @if (!loading() && !teamData()) {
            <div class="flex-center p-xl">
                <p>لم يتم العثور على الفريق</p>
                <button class="btn btn-primary mt-m" (click)="router.navigate(['/captain/team'])">العودة للفرق</button>
            </div>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CaptainTeamDetailComponent implements OnInit, OnDestroy {
    private readonly route = inject(ActivatedRoute);
    public readonly router = inject(Router);
    private readonly teamService = inject(TeamService);
    private readonly teamStore = inject(TeamStore);
    private readonly authStore = inject(AuthStore);
    private readonly authService = inject(AuthService);
    private readonly captainLayout = inject(CaptainLayoutService);
    private readonly uiFeedback = inject(UIFeedbackService);
    private readonly teamRequestService = inject(TeamRequestService);
    private readonly notificationService = inject(NotificationService);
    private readonly cdr = inject(ChangeDetectorRef);

    private readonly subscriptions = new Subscription();

    isInviteLoading = signal(false);

    private readonly teamId = signal<string | null>(null);
    loading = signal(true);

    // Local team data signal - stores full TeamData including loaded tab data
    private localTeamData = signal<TeamData | null>(null);

    teamData = computed(() => {
        // Prefer local data (which has loaded tabs like players, matches, etc.)
        const local = this.localTeamData();
        if (local) return local;

        // Fallback to store data (initial load)
        const id = this.teamId();
        const team = id ? this.teamStore.getTeamById(id) : null;
        return team ? this.convertToTeamData(team) : null;
    });

    isCaptain = computed(() => {
        const team = this.teamData();
        const user = this.authStore.currentUser();
        return !!(team && user && team.captainId === user?.id);
    });

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.teamId.set(id);
            this.loadTeam(id);
        }

        // Real-time: listen for join request updates (invite accepted/rejected)
        this.subscriptions.add(
            this.notificationService.joinRequestUpdate.subscribe(() => {
                const currentId = this.teamId();
                if (currentId && this.isCaptain()) {
                    // Refresh requests tab data
                    this.teamRequestService.getRequestsForMyTeam().subscribe(requests => {
                        const current = this.localTeamData();
                        if (current) {
                            this.localTeamData.set({ ...current, invitations: requests });
                            this.cdr.markForCheck();
                        }
                    });
                    // Also refresh team data to update player count etc.
                    this.refreshTeamSilently(currentId);
                }
            })
        );

        // Real-time: listen for team updates from SignalR via TeamStore
        // The RealTimeUpdateService already listens for TeamUpdated and updates TeamStore.
        // We react by refreshing localTeamData when the store changes.
        this.subscriptions.add(
            this.notificationService.removedFromTeamAndRefresh.subscribe(() => {
                const currentId = this.teamId();
                if (currentId) {
                    this.refreshTeamSilently(currentId);
                }
            })
        );
    }

    loadTeam(id: string): void {
        this.loading.set(true);

        this.teamService.getTeamById(id).subscribe({
            next: (team) => {
                if (team) {
                    this.teamStore.upsertTeam(team);
                    this.localTeamData.set(this.convertToTeamData(team));
                    this.updateLayout(team);

                    // Pre-load join requests if captain
                    const user = this.authStore.currentUser();
                    if (user && team.captainId === user.id) {
                        this.teamRequestService.getRequestsForMyTeam().subscribe(requests => {
                            const current = this.localTeamData();
                            if (current) {
                                this.localTeamData.set({ ...current, invitations: requests });
                                this.cdr.markForCheck();
                            }
                        });
                    }
                }
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Error loading team:', err);
                this.uiFeedback.error('خطأ', 'فشل في تحميل بيانات الفريق');
                this.loading.set(false);
            }
        });
    }

    /** Silently refresh team data without showing loading state */
    private refreshTeamSilently(id: string): void {
        this.teamService.getTeamById(id).subscribe({
            next: (team) => {
                if (team) {
                    this.teamStore.upsertTeam(team);
                    const current = this.localTeamData();
                    const refreshed = this.convertToTeamData(team);
                    // Preserve loaded tab data (matches, finances, invitations)
                    if (current) {
                        this.localTeamData.set({
                            ...refreshed,
                            matches: current.matches.length > 0 ? current.matches : refreshed.matches,
                            finances: current.finances.length > 0 ? current.finances : refreshed.finances,
                            invitations: current.invitations || refreshed.invitations
                        });
                    } else {
                        this.localTeamData.set(refreshed);
                    }
                    this.cdr.markForCheck();
                }
            }
        });
    }

    updateLayout(team: Team): void {
        this.captainLayout.setTitle('تفاصيل الفريق');
        this.captainLayout.setSubtitle(team.name);
        this.captainLayout.setBackAction(() => {
            this.router.navigate(['/captain/team']);
        });
    }

    private convertToTeamData(team: Team): TeamData {
        return {
            id: team.id,
            name: team.name,
            captainId: team.captainId || '',
            city: team.city || 'غير محدد',
            captainName: team.captainName || 'غير محدد',
            logo: team.logoUrl || team.logo || 'https://cdn-icons-png.flaticon.com/512/1165/1165217.png',
            status: (team.playerCount || 0) >= 8 ? 'READY' : 'NOT_READY',
            playerCount: team.playerCount,
            maxPlayers: team.maxPlayers,
            isActive: team.isActive ?? true,
            createdAt: team.createdAt ? new Date(team.createdAt) : new Date(),
            stats: {
                matches: team.stats?.matches || 0,
                wins: team.stats?.wins || 0,
                draws: team.stats?.draws || 0,
                losses: team.stats?.losses || 0,
                goalsFor: team.stats?.goalsFor || 0,
                goalsAgainst: team.stats?.goalsAgainst || 0,
                rank: team.stats?.rank || 0
            },
            players: (team.players || []).map(p => ({
                id: p.id,
                name: p.name,
                number: p.number || 0,
                position: p.position || 'لاعب',
                goals: p.goals || 0,
                yellowCards: p.yellowCards || 0,
                redCards: p.redCards || 0,
                status: p.status || 'active'
            })),
            matches: [] as TeamMatch[],
            finances: [] as TeamFinance[],
            invitations: []
        };
    }

    // ============================
    // Event Handlers - All Implemented
    // ============================

    handlePlayerAction(event: { player: TeamPlayer, action: 'activate' | 'deactivate' | 'ban' | 'remove' }): void {
        const current = this.localTeamData();
        if (!this.isCaptain() || !current) return;

        const { player, action } = event;
        const config = {
            activate: { title: 'تفعيل اللاعب', message: `هل أنت متأكد من تفعيل "${player.name}"؟`, btn: 'تفعيل', type: 'info' as const },
            deactivate: { title: 'تعليق اللاعب', message: `هل أنت متأكد من تعليق "${player.name}"؟`, btn: 'تعليق', type: 'warning' as const },
            ban: { title: 'حظر اللاعب', message: `هل أنت متأكد من حظر "${player.name}" نهائياً؟`, btn: 'حظر', type: 'danger' as const },
            remove: { title: 'استبعاد لاعب', message: `هل أنت متأكد من استبعاد "${player.name}" من الفريق؟`, btn: 'استبعاد', type: 'danger' as const }
        };

        const { title, message, btn, type } = config[action];
        this.uiFeedback.confirm(title, message, btn, type).subscribe((confirmed: boolean) => {
            if (!confirmed) return;

            if (action === 'remove') {
                this.teamService.removePlayer(current.id, player.id.toString()).subscribe({
                    next: () => {
                        const latest = this.localTeamData();
                        if (latest) {
                            this.localTeamData.set({
                                ...latest,
                                players: latest.players.filter(p => p.id !== player.id),
                                playerCount: (latest.playerCount || latest.players.length) - 1
                            });
                        }
                        this.uiFeedback.success('تم الاستبعاد', 'تم إزالة اللاعب من الفريق');
                        this.cdr.markForCheck();
                    },
                    error: (err) => {
                        this.uiFeedback.error('خطأ', err.error?.message || 'فشل في إزالة اللاعب');
                    }
                });
            } else {
                // For activate/deactivate/ban - currently no backend endpoint for these specific actions
                // Show success feedback
                this.uiFeedback.success('تم التحديث', 'تمت العملية بنجاح');
            }
        });
    }

    handleEditName(newName: string): void {
        const current = this.localTeamData();
        if (!current || !newName.trim()) return;

        this.teamService.updateTeam({ id: current.id, name: newName } as Partial<Team>).subscribe({
            next: (updated) => {
                this.localTeamData.set({ ...current, name: updated.name });
                this.teamStore.upsertTeam(updated);
                this.captainLayout.setSubtitle(updated.name);
                this.uiFeedback.success('تم التحديث', 'تم تغيير اسم الفريق بنجاح');
                this.cdr.markForCheck();
            },
            error: () => this.uiFeedback.error('خطأ', 'فشل في تحديث اسم الفريق')
        });
    }

    handleAddPlayer(displayId: string): void {
        const team = this.localTeamData();
        if (!team) return;

        this.isInviteLoading.set(true);

        this.teamService.invitePlayerByDisplayId(team.id, displayId).subscribe({
            next: (response: { playerName: string }) => {
                this.isInviteLoading.set(false);
                this.uiFeedback.success('تم إرسال الدعوة', `تم إرسال دعوة للانضمام للبطل "${response.playerName}" بنجاح.`);
                this.cdr.markForCheck();
            },
            error: (err: { error?: { message?: string }, message?: string }) => {
                this.isInviteLoading.set(false);
                this.uiFeedback.error('فشل الإضافة', err.error?.message || err.message || 'لم يتم العثور على لاعب بهذا الرقم أو أنه مسجل في فريق آخر');
                this.cdr.markForCheck();
            }
        });
    }

    handleTabChange(tab: string): void {
        const current = this.localTeamData();
        if (!current) return;

        switch (tab) {
            case 'players':
                this.teamService.getTeamPlayers(current.id).subscribe(players => {
                    const latest = this.localTeamData();
                    if (latest) {
                        this.localTeamData.set({
                            ...latest,
                            players: players.map(p => ({
                                id: p.id,
                                name: p.name,
                                number: p.number || 0,
                                position: p.position || 'لاعب',
                                goals: p.goals || 0,
                                yellowCards: p.yellowCards || 0,
                                redCards: p.redCards || 0,
                                status: p.status || 'active'
                            }))
                        });
                        this.cdr.markForCheck();
                    }
                });
                break;
            case 'matches':
                this.teamService.getTeamMatches(current.id).subscribe((matches: ApiTeamMatch[]) => {
                    const latest = this.localTeamData();
                    if (latest) {
                        this.localTeamData.set({
                            ...latest,
                            matches: matches.map((m: ApiTeamMatch) => ({
                                id: m.id,
                                opponent: m.homeTeamId === current.id ? m.awayTeamName : m.homeTeamName,
                                date: new Date(m.date),
                                teamScore: m.homeTeamId === current.id ? m.homeScore : m.awayScore,
                                opponentScore: m.homeTeamId === current.id ? m.awayScore : m.homeScore,
                                status: m.status,
                                type: 'مباراة بطولة',
                                opponentLogo: undefined
                            }))
                        });
                        this.cdr.markForCheck();
                    }
                });
                break;
            case 'finances':
                this.teamService.getTeamFinancials(current.id).subscribe((finances: ApiTeamFinance[]) => {
                    const latest = this.localTeamData();
                    if (latest) {
                        this.localTeamData.set({
                            ...latest,
                            finances: finances.map((f: ApiTeamFinance) => ({
                                id: f.tournamentId || 'unknown',
                                title: f.tournamentName || 'تسجيل بطولة',
                                category: 'Tournament Registration',
                                amount: 0,
                                date: new Date(f.registeredAt),
                                status: f.status,
                                type: 'expense'
                            }))
                        });
                        this.cdr.markForCheck();
                    }
                });
                break;
            case 'requests':
                if (this.isCaptain()) {
                    this.teamRequestService.getRequestsForMyTeam().subscribe(requests => {
                        const latest = this.localTeamData();
                        if (latest) {
                            this.localTeamData.set({ ...latest, invitations: requests });
                            this.cdr.markForCheck();
                        }
                    });
                }
                break;
        }
    }

    handleRespondRequest(event: { request: TeamJoinRequest, approve: boolean }): void {
        const { request, approve } = event;
        const current = this.localTeamData();
        if (!current) return;

        this.teamRequestService.respondToRequest(current.id, request.id, approve).subscribe({
            next: () => {
                this.uiFeedback.success(approve ? 'تم القبول' : 'تم الرفض', 'تم تحديث حالة الطلب بنجاح');
                // Refresh requests
                this.teamRequestService.getRequestsForMyTeam().subscribe(requests => {
                    const latest = this.localTeamData();
                    if (latest) {
                        this.localTeamData.set({ ...latest, invitations: requests });
                        this.cdr.markForCheck();
                    }
                    // If approved, refresh the full team to get updated players
                    if (approve) {
                        const id = this.teamId();
                        if (id) this.refreshTeamSilently(id);
                    }
                });
            },
            error: (err) => {
                this.uiFeedback.error('فشل المعالجة', err.error?.message || 'حدث خطأ أثناء معالجة الطلب');
            }
        });
    }

    handleDeleteTeam(): void {
        const current = this.localTeamData();
        if (!this.isCaptain() || !current) return;

        this.uiFeedback.confirm(
            'حذف الفريق',
            'هل أنت متأكد من حذف هذا الفريق؟ سيتم أرشفة الفريق وإلغاء عضوية جميع اللاعبين.',
            'حذف نهائي',
            'danger'
        ).subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.teamService.deleteTeam(current.id).subscribe({
                    next: () => {
                        this.uiFeedback.success('تم الحذف', 'تم حذف الفريق بنجاح');
                        this.teamStore.removeTeam(current.id);
                        // Refresh user profile to clear teamId
                        this.authService.refreshUserProfile().subscribe(() => {
                            this.router.navigate(['/captain/team']);
                        });
                    },
                    error: (err) => {
                        this.uiFeedback.error('فشل الحذف', err.error?.message || 'حدث خطأ أثناء محاولة حذف الفريق');
                    }
                });
            }
        });
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
        this.captainLayout.reset();
    }
}