import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ContextNavigationService } from '../../../../core/navigation/context-navigation.service';
import { switchMap, tap, finalize } from 'rxjs/operators';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { TeamDetailComponent, TeamData, TeamPlayer } from '../../../../shared/components/team-detail';
import { TeamService } from '../../../../core/services/team.service';
import { Team } from '../../../../core/models/team.model';
import { MatchService } from '../../../../core/services/match.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TeamStore } from '../../../../core/stores/team.store';
import { MatchStore } from '../../../../core/stores/match.store';
import { Match } from '../../../../core/models/tournament.model';
import { LayoutOrchestratorService } from '../../../../core/services/layout-orchestrator.service';
import { Permission } from '../../../../core/permissions/permissions.model';
import { PermissionsService } from '../../../../core/services/permissions.service';
import { UserRole } from '../../../../core/models/user.model';
import { TeamRequestService } from '../../../../core/services/team-request.service';
import { TeamJoinRequest } from '../../../../core/models/team-request.model';

@Component({
    selector: 'app-team-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        TeamDetailComponent
    ],
    template: `
        <!-- Show content if we have team data, even if still loading/refreshing -->
        @if (teamData()) {
            <app-team-detail 
                [team]="teamData()!"
                [showBackButton]="true"
                [backRoute]="backRoute()"
                [canEditName]="canManageTeam()"
                [canAddPlayers]="canManageTeam()"
                [canRemovePlayers]="canManageTeam()"
                [canManageStatus]="canManageGlobal()"
                [canManageInvitations]="canManageTeam()"
                [canDeleteTeam]="canManageGlobal() || isCaptain()"
                [canSeeRequests]="canManageTeam() || canManageGlobal()"
                (playerAction)="handlePlayerAction($event)"
                (editName)="handleEditName($event)"
                (addPlayer)="handleAddPlayer($event)"
                (tabChanged)="handleTabChange($event)"
                (respondRequest)="handleRespondRequest($event)"
                (deleteTeam)="handleDeleteTeam()"
                (disableTeam)="handleDisableTeam()" />
        }

        <!-- Only show centering spinner if we have NO data yet -->
        @if (isLoading() && !teamData()) {
            <div class="flex-center p-xl loading-viewport">
                <div class="spinner-lg"></div>
            </div>
        }

        @if (!isLoading() && !teamData()) {
            <div class="flex-center p-xl">
                <p>لم يتم العثور على الفريق</p>
                <button class="btn btn-primary mt-m" (click)="goToTeamsList()">العودة للفرق</button>
            </div>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [`
        .loading-viewport {
            min-height: 400px;
        }
    `]
})
export class TeamDetailPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    public readonly router = inject(Router);
    private readonly teamService = inject(TeamService);
    private readonly matchService = inject(MatchService);
    private readonly uiFeedback = inject(UIFeedbackService);
    private readonly authService = inject(AuthService);
    private readonly teamRequestService = inject(TeamRequestService);
    private readonly teamStore: TeamStore = inject(TeamStore);
    private readonly matchStore: MatchStore = inject(MatchStore);
    private readonly layoutOrchestrator = inject(LayoutOrchestratorService);
    private readonly permissionsService = inject(PermissionsService);
    protected readonly cd = inject(ChangeDetectorRef);
    private readonly navService = inject(ContextNavigationService);
    private readonly destroyRef = inject(DestroyRef);

    teamId = signal<string | null>(null);
    isLoading = signal<boolean>(true);

    // Permission Signals
    isCaptain = computed(() => {
        const team = this.teamStore.getTeamById(this.teamId() || '');
        const user = this.authService.getCurrentUser();
        return !!(team && user && team.players.some(p => p.id === user.id && p.teamRole === 'Captain'));
    });

    canManageTeam = computed(() => {
        return this.isCaptain() || this.permissionsService.has(Permission.MANAGE_TEAMS);
    });

    canManageGlobal = computed(() => {
        return this.permissionsService.has(Permission.MANAGE_TEAMS);
    });

    backRoute = computed(() => {
        const prefix = this.navService.getRootPrefix();
        if (prefix === '/admin') return '/admin/teams';
        return '/captain/matches'; // Default for captain/player context on team detail
    });

    // Computed Matches for this team (Real-Time Source of Truth)
    teamMatches = computed(() => {
        const id = this.teamId();
        if (!id) return [];
        return this.matchStore.matches().filter((m: Match) => m.homeTeamId === id || m.awayTeamId === id).map((m: Match) => ({
            id: m.id,
            opponent: m.homeTeamId === id ? m.awayTeamName : m.homeTeamName,
            opponentLogo: m.homeTeamId === id ? m.awayTeamLogoUrl : m.homeTeamLogoUrl,
            date: m.date ? new Date(m.date) : new Date(),
            score: `${m.homeScore}-${m.awayScore}`,
            teamScore: m.homeTeamId === id ? m.homeScore : m.awayScore,
            opponentScore: m.homeTeamId === id ? m.awayScore : m.homeScore,
            status: m.status,
            type: 'مباراة دوري'
        }));
    });

    // Computed Stats from Matches
    teamStats = computed(() => {
        const matches = this.teamMatches();
        const stats = { matches: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, rank: 0 };

        matches.filter((m: { status: string }) => m.status === 'Finished').forEach((m: { teamScore: number, opponentScore: number }) => {
            stats.matches++;
            stats.goalsFor += m.teamScore || 0;
            stats.goalsAgainst += m.opponentScore || 0;
            if (m.teamScore! > m.opponentScore!) stats.wins++;
            else if (m.teamScore! < m.opponentScore!) stats.losses++;
            else stats.draws++;
        });
        return stats;
    });

    // Local data for UI state that isn't in main Team model
    invitations = signal<TeamJoinRequest[]>([]);

    // Combined Team Data View Model
    teamData = computed((): TeamData | null => {
        const id = this.teamId();
        const t = id ? this.teamStore.getTeamById(id) : null;
        if (!t) return null;

        const stats = this.teamStats();

        // Map Team Store Entity + Computed Stats + Computed Matches -> View Model
        return {
            id: t.id,
            name: t.name,
            city: t.city || 'غير محدد',
            captainName: t.captainName || 'غير معروف',
            logo: t.logoUrl || t.logo || 'assets/images/team-placeholder.png',
            status: 'READY',
            isActive: t.isActive ?? false,
            createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
            stats: stats,
            players: (t.players || []).map((p: { id: string, name: string, number?: number, position?: string, goals?: number, yellowCards?: number, redCards?: number, status?: string }) => ({
                id: p.id,
                name: p.name,
                number: p.number || 0,
                position: p.position || 'لاعب',
                goals: p.goals || 0,
                yellowCards: p.yellowCards || 0,
                redCards: p.redCards || 0,
                status: p.status || 'active'
            })),
            matches: this.teamMatches(),
            finances: [],
            invitations: this.invitations()
        };
    });

    ngOnInit(): void {
        this.layoutOrchestrator.reset();
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.teamId.set(id);
            this.loadInitialData(id);
            this.loadInvitations();
        } else {
            this.goToTeamsList();
        }
    }

    loadInvitations(): void {
        if (this.canManageTeam()) {
            this.teamRequestService.getRequestsForMyTeam().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(requests => {
                this.invitations.set(requests);
                this.cd.markForCheck();
            });
        }
    }

    goToTeamsList(): void {
        const prefix = this.navService.getRootPrefix();
        if (prefix === '/admin') {
            this.navService.navigateTo('teams');
        } else {
            this.navService.navigateTo('matches'); // Or team home
        }
    }

    loadInitialData(id: string): void {
        this.isLoading.set(true);

        this.teamService.getTeamById(id).pipe(
            takeUntilDestroyed(this.destroyRef),
            tap(data => {
                if (data) {
                    this.teamStore.upsertTeam(data);
                    this.updateLayout(data);
                }
            }),
            switchMap(() => this.matchService.getMatchesByTeam(id).pipe(takeUntilDestroyed(this.destroyRef))),
            tap(matches => {
                matches.forEach(m => {
                    if (!this.matchStore.getMatchById(m.id)) this.matchStore.addMatch(m);
                    else this.matchStore.updateMatch(m);
                });
            }),
            finalize(() => this.isLoading.set(false))
        ).subscribe({
            error: () => this.isLoading.set(false)
        });
    }

    updateLayout(team: Team): void {
        this.layoutOrchestrator.setTitle('تفاصيل الفريق');
        this.layoutOrchestrator.setSubtitle(team.name);
        this.layoutOrchestrator.setBackAction(() => this.goToTeamsList());
    }

    handleDeleteTeam(): void {
        const t = this.teamData();
        if (!t) return;

        this.uiFeedback.confirm(
            'حذف الفريق',
            'هل أنت متأكد من حذف هذا الفريق؟ سيتم أرشفة الفريق وإلغاء عضوية جميع اللاعبين.',
            'حذف نهائي',
            'danger'
        ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.teamService.deleteTeam(t.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
                    next: () => {
                        this.teamStore.removeTeam(t.id);
                        this.authService.refreshUserProfile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
                        this.uiFeedback.success('تم الحذف', 'تم حذف الفريق بنجاح');
                        this.goToTeamsList();
                    },
                    error: (err) => {
                        this.uiFeedback.error('خطأ', err.error?.message || 'فشل حذف الفريق');
                    }
                });
            }
        });
    }

    handleEditName(newName: string): void {
        const current = this.teamData();
        if (!current || !newName.trim()) return;

        this.teamService.updateTeam({ id: current.id, name: newName } as Partial<Team>).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (updated) => {
                this.teamStore.upsertTeam(updated);
                this.uiFeedback.success('تم التحديث', 'تم تغيير اسم الفريق بنجاح');
            },
            error: () => this.uiFeedback.error('خطأ', 'فشل في تحديث اسم الفريق')
        });
    }

    handleAddPlayer(displayId: string): void {
        const team = this.teamData();
        if (!team) return;

        this.teamService.invitePlayerByDisplayId(team.id, displayId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (response: { playerName: string }) => {
                this.uiFeedback.success('تم إرسال الدعوة', `تم إرسال دعوة للانضمام للبطل "${response.playerName}" بنجاح.`);
            },
            error: (err: { error?: { message?: string }, message?: string }) => {
                this.uiFeedback.error('فشل الإضافة', err.error?.message || err.message || 'لم يتم العثور على لاعب بهذا الرقم أو أنه مسجل في فريق آخر');
            }
        });
    }

    handleTabChange(tab: string): void {
        const current = this.teamData();
        if (!current) return;

        switch (tab) {
            case 'players':
                this.teamService.getTeamPlayers(current.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(players => {
                    const team = this.teamStore.getTeamById(current.id);
                    if (team) {
                        this.teamStore.updateTeam({ ...team, players });
                    }
                });
                break;
            case 'matches':
                this.matchService.getMatchesByTeam(current.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(matches => {
                    matches.forEach(m => {
                        if (this.matchStore.getMatchById(m.id)) {
                            this.matchStore.updateMatch(m);
                        } else {
                            this.matchStore.addMatch(m);
                        }
                    });
                });
                break;
            case 'requests':
                this.loadInvitations();
                break;
        }
    }

    handleRespondRequest(event: { request: TeamJoinRequest, approve: boolean }): void {
        const { request, approve } = event;
        const current = this.teamData();
        if (!current) return;

        this.teamRequestService.respondToRequest(current.id, request.id, approve).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => {
                this.uiFeedback.success(approve ? 'تم القبول' : 'تم الرفض', 'تم تحديث حالة الطلب بنجاح');
                // Refresh full team data to update player count and list
                this.loadInitialData(current.id);
            },
            error: (err) => {
                this.uiFeedback.error('فشل المعالجة', err.error?.message || 'حدث خطأ أثناء معالجة الطلب');
            }
        });
    }

    handleDisableTeam(): void {
        const t = this.teamData();
        if (!t) return;

        this.teamService.disableTeam(t.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => {
                this.uiFeedback.success('تم التعطيل', 'تم تعطيل الفريق وانسحابه من أي بطولة حالية');
                this.loadInitialData(t.id);
            },
            error: () => {
                this.uiFeedback.error('خطأ', 'فشل في تعطيل الفريق');
            }
        });
    }

    handlePlayerAction(event: { player: TeamPlayer, action: string }): void {
        const { player, action } = event;
        const config = {
            activate: { title: 'تفعيل اللاعب', message: `هل أنت متأكد من تفعيل اللاعب "${player.name}"؟`, btn: 'تفعيل الآن', type: 'info' as const },
            deactivate: { title: 'تعطيل اللاعب', message: `هل أنت متأكد من تعطيل اللاعب "${player.name}"؟`, btn: 'تعطيل اللاعب', type: 'danger' as const },
            ban: { title: 'حظر اللاعب', message: `هل أنت متأكد من حظر اللاعب "${player.name}"؟`, btn: 'حظر نهائي', type: 'danger' as const },
            remove: { title: 'إزالة اللاعب', message: `هل أنت متأكد من إزالة اللاعب "${player.name}" من الفريق؟`, btn: 'إزالة الآن', type: 'danger' as const }
        };

        const { title, message, btn, type } = config[action as keyof typeof config];
        this.uiFeedback.confirm(title, message, btn, type).subscribe((confirmed: boolean) => {
            if (confirmed) {
                const t = this.teamData();
                if (!t) return;

                if (action === 'remove') {
                    this.teamService.removePlayer(t.id, player.id.toString()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
                        next: () => {
                            this.uiFeedback.success('تم الحذف', 'تم إزالة اللاعب من الفريق');
                            this.loadInitialData(t.id);
                        },
                        error: () => {
                            this.uiFeedback.error('خطأ', 'فشل في إزالة اللاعب');
                        }
                    });
                } else {
                    this.uiFeedback.info('قريباً', 'هذه الميزة غير مفعلة حالياً');
                }
            }
        });
    }
}
