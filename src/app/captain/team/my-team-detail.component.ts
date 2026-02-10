import { Component, OnInit, OnDestroy, inject, effect, signal, untracked, computed, DestroyRef, ChangeDetectionStrategy, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TeamData, TeamPlayer, TeamMatch, TeamFinance } from '../../shared/components/team-detail';
import { TeamService } from '../../core/services/team.service';
import { Team, ApiTeamMatch, ApiTeamFinance } from '../../core/models/team.model';
import { SmartImageComponent } from '../../shared/components/smart-image/smart-image.component';
import { AuthService } from '../../core/services/auth.service';
import { UIFeedbackService } from '../../shared/services/ui-feedback.service';
import { User, UserStatus } from '../../core/models/user.model';

import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { TeamRequestService } from '../../core/services/team-request.service';
import { NotificationService } from '../../core/services/notification.service';
import { TeamJoinRequest } from '../../core/models/team-request.model';
import { TeamStore } from '../../core/stores/team.store';
import { AuthStore } from '../../core/stores/auth.store';
import { CaptainLayoutService } from '../../core/services/captain-layout.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';

interface TeamStats {
    matches: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    rank: number;
}


interface ExtendedTeam extends Team {
    stats?: TeamStats;
    isActive?: boolean;
}

interface TeamsOverview {
    ownedTeams: Team[];
    memberTeams: Team[];
    pendingInvitations: TeamJoinRequest[];
}


@Component({
    selector: 'app-my-team-detail',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonComponent,
        SmartImageComponent,
        ModalComponent
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './my-team-detail.component.html',
    styleUrls: ['./my-team-detail.component.scss']
})
export class MyTeamDetailComponent implements OnInit, AfterViewInit, OnDestroy {
    private readonly router = inject(Router);
    private readonly teamService = inject(TeamService);
    private readonly authService = inject(AuthService);
    private readonly uiFeedback = inject(UIFeedbackService);
    private readonly teamRequestService = inject(TeamRequestService);
    private readonly notificationService = inject(NotificationService);
    private readonly authStore = inject(AuthStore);
    private readonly teamStore = inject(TeamStore);
    private readonly destroyRef = inject(DestroyRef);
    private readonly captainLayout = inject(CaptainLayoutService);
    private readonly cdr = inject(ChangeDetectorRef);



    private userSubscription: Subscription | null = null;

    currentUser: User | null = null;
    teamData = signal<TeamData | null>(null);
    loading = signal<boolean>(true);
    private isLoadingTeam = false;

    // Multi-team support
    teamsOverview = signal<TeamsOverview | null>(null);

    // Computed signals replace manual effect updates + setTimeout
    isCaptain = computed(() => {
        const team = this.teamData();
        const user = this.authStore.currentUser();
        return !!(team && user && team.captainId === user.id);
    });

    isAdmin = computed(() => this.authStore.currentUser()?.role === 'Admin');

    // UI state properties
    isAddingPlayer = false;
    newTeamName = '';
    creatingTeam = false;
    pendingInvitations = signal<TeamJoinRequest[]>([]);
    showCreateTeamForm = false;
    showCreateTeamModal = false;

    isUserPending = computed(() => this.authStore.currentUser()?.status === UserStatus.PENDING);

    constructor() {
        // Reactive effect: Watch Auth state for real-time updates
        // NOTE: We don't watch teamStore.teams() anymore to avoid circular dependencies
        effect(() => {
            const user = this.authStore.currentUser(); // Track user changes (REACTIVE SIGNAL)

            // Collect current state without tracking it
            const currentData = untracked(() => this.teamData());
            const isLoading = untracked(() => this.isLoadingTeam);
            const teamsOverviewData = untracked(() => this.teamsOverview());

            // Update local reference (non-signal, safe to mutate)
            untracked(() => { this.currentUser = user; });

            // READ-ONLY: Only decide if loadTeamData() should be triggered
            // All signal mutations happen inside loadTeamData()'s HTTP callbacks
            untracked(() => {
                // Skip if already loading
                if (isLoading) return;

                // Case 1: No user - trigger reset via loadTeamData
                if (!user) {
                    if (currentData || teamsOverviewData) {
                        this.loadTeamData();
                    } else if (this.loading()) {
                        queueMicrotask(() => this.loading.set(false));
                    }
                    return;
                }

                // Case 2: User has no team id - trigger loadTeamData to reset state
                if (!user.teamId) {
                    if (currentData || teamsOverviewData) {
                        // User lost their team - loadTeamData will clear teamData
                        this.loadTeamData();
                    } else {
                        // User has no team ID and we have no data.
                        // We MUST try to load to see if they are a captain (fallback)
                        this.loadTeamData();
                    }
                    return;
                }

                // Case 3: User has a team id - check if we need to load it
                const storeTeam = this.teamStore.getTeamById(user.teamId);

                if (!storeTeam && !teamsOverviewData) {
                    // Team not in store and no overview data - fetch it
                    this.loadTeamData();
                } else if (teamsOverviewData && this.loading()) {
                    // We have data but still loading - turn off loading
                    queueMicrotask(() => this.loading.set(false));
                }
            });
        });
    }

    private subscriptions = new Subscription();

    ngOnInit(): void {
        this.currentUser = this.authService.getCurrentUser();
        if (!this.currentUser) {
            this.router.navigate(['/auth/login']);
            return;
        }

        this.authService.refreshUserProfile().subscribe();
        this.loadInvitations();

        this.subscriptions.add(
            this.notificationService.joinRequestUpdate.subscribe(() => {
                if (!this.currentUser) return;

                const currentData = this.teamData();
                if (currentData && this.isCaptain()) {
                    this.teamRequestService.getRequestsForMyTeam().subscribe(requests => {
                        const latestData = this.teamData();
                        if (latestData) {
                            this.teamData.set({ ...latestData, invitations: requests });
                        }
                    });
                } else if (!currentData) {
                    this.authService.refreshUserProfile().subscribe({
                        next: (updatedUser) => {
                            if (updatedUser?.teamId) {
                                this.loadTeamData();
                            } else {
                                this.loadInvitations();
                            }
                        },
                        error: () => this.loadInvitations()
                    });
                } else {
                    this.loadInvitations();
                }
            })
        );
    }

    ngAfterViewInit(): void {
        // Set up the layout with page title
        this.captainLayout.setTitle('فريقي');
        this.captainLayout.setSubtitle('إدارة فرقك والانضمام إلى فرق أخرى');

        // Use actionHandler directly instead of template to avoid OnPush change detection issues
        setTimeout(() => {
            this.captainLayout.setActionHandler(() => this.openCreateTeamModal());
        });
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
        // Reset layout when component is destroyed
        this.captainLayout.reset();
    }

    loadInvitations(): void {
        this.teamRequestService.getMyInvitations().subscribe({
            next: (invites) => {
                this.pendingInvitations.set(invites);
            }
        });
    }

    acceptInvite(requestId: string): void {
        this.loading.set(true);
        this.pendingInvitations.set([]);

        this.teamRequestService.acceptRequest(requestId).subscribe({
            next: (response) => {
                this.uiFeedback.success('تمت الإضافة', 'أهلاً بك في فريقك الجديد!');

                // Typed response handling
                const teamId = (response as { teamId: string }).teamId;

                if (teamId && typeof teamId === 'string') {
                    if (this.currentUser) {
                        const updatedUser = { ...this.currentUser, teamId };
                        this.currentUser = updatedUser;
                        this.authService.updateCurrentUser(updatedUser);
                    }
                    this.loadTeamData();
                    this.authService.refreshUserProfile().subscribe();
                } else {
                    console.warn('Backend did not return teamId. Falling back to refresh.');
                    this.authService.refreshUserProfile().subscribe({
                        next: (updatedUser) => {
                            if (updatedUser?.teamId) {
                                this.currentUser = updatedUser;
                                this.loadTeamData();
                            } else {
                                this.loading.set(false);
                                this.loadInvitations();
                            }
                        },
                        error: () => {
                            this.loading.set(false);
                            this.loadInvitations();
                        }
                    });
                }
            },
            error: (err) => {
                this.loading.set(false);
                this.loadInvitations();
                this.uiFeedback.error('فشل القبول', err.message);
            }
        });
    }

    rejectInvite(requestId: string): void {
        this.teamRequestService.rejectRequest(requestId).subscribe({
            next: () => {
                this.pendingInvitations.update(invites => invites.filter(i => i.id !== requestId));
                this.uiFeedback.success('تم الرفض', 'تم رفض الدعوة بنجاح');
            }
        });
    }

    loadTeamData(): void {
        if (this.isLoadingTeam) return;

        if (!this.currentUser) {
            this.teamData.set(null);
            this.teamsOverview.set(null);
            this.loading.set(false);
            return;
        }

        this.isLoadingTeam = true;
        if (!this.loading()) {
            queueMicrotask(() => this.loading.set(true));
        }

        console.log('Loading teams overview for user:', this.currentUser.id);

        // Load teams overview instead of single team
        this.teamService.getTeamsOverview().subscribe({
            next: (overview: TeamsOverview) => {
                console.log('Teams overview loaded:', overview);
                queueMicrotask(() => {
                    this.isLoadingTeam = false;
                    this.loading.set(false);
                    this.teamsOverview.set(overview);
                    this.pendingInvitations.set(overview.pendingInvitations);

                    // For backward compatibility, set the first team as current teamData
                    // Priority: owned teams first, then member teams
                    let currentTeam: Team | null = null;
                    if (overview.ownedTeams.length > 0) {
                        currentTeam = overview.ownedTeams[0];
                        console.log('Setting first owned team as current:', currentTeam.name);
                    } else if (overview.memberTeams.length > 0) {
                        currentTeam = overview.memberTeams[0];
                        console.log('Setting first member team as current:', currentTeam.name);
                    }

                    if (currentTeam) {
                        const existingTeam = this.teamStore.getTeamById(currentTeam.id);
                        if (existingTeam) {
                            this.teamStore.updateTeam(currentTeam);
                        } else {
                            this.teamStore.addTeam(currentTeam);
                        }

                        const converted = this.convertToTeamData(currentTeam);
                        this.teamData.set(converted);

                        // Load invitations for captain teams
                        if (currentTeam.captainId === this.currentUser?.id) {
                            this.teamRequestService.getRequestsForMyTeam().subscribe(requests => {
                                const current = this.teamData();
                                if (current) {
                                    this.teamData.set({ ...current, invitations: requests });
                                }
                            });
                        }
                    } else {
                        console.log('No teams found for user');
                        this.teamData.set(null);
                        this.loadInvitations();
                    }
                });
            },
            error: (err) => {
                console.error('Error loading teams overview:', err);
                queueMicrotask(() => {
                    this.isLoadingTeam = false;
                    this.loading.set(false);
                    this.teamsOverview.set(null);
                    this.teamData.set(null);
                    this.uiFeedback.error('خطأ في التحميل', 'فشل في تحميل بيانات الفرق. يرجى المحاولة مرة أخرى.');
                });
            }
        });
    }

    navigateToTeamDetail(teamId: string): void {
        // SPA navigation to team detail page
        this.router.navigate(['/captain/team', teamId]);
    }

    selectTeam(team: Team): void {
        const existingTeam = this.teamStore.getTeamById(team.id);
        if (existingTeam) {
            this.teamStore.updateTeam(team);
        } else {
            this.teamStore.addTeam(team);
        }

        const converted = this.convertToTeamData(team);
        this.teamData.set(converted);

        // Load invitations for captain teams
        if (team.captainId === this.currentUser?.id) {
            this.teamRequestService.getRequestsForMyTeam().subscribe(requests => {
                const current = this.teamData();
                if (current) {
                    this.teamData.set({ ...current, invitations: requests });
                }
            });
        }
    }

    createNewTeam(): void {
        if (!this.currentUser) return;

        if (this.isUserPending()) {
            this.uiFeedback.error('تنبيه', 'لا يمكنك إنشاء فريق قبل تفعيل حسابك من قبل الإدارة');
            return;
        }

        if (!this.newTeamName.trim()) {
            this.uiFeedback.warning('تنبيه', 'يرجى إدخال اسم الفريق');
            return;
        }

        this.creatingTeam = true;
        this.loading.set(true); // Show loading while creating

        console.log('Creating new team:', this.newTeamName);

        this.teamService.createTeam(this.currentUser, this.newTeamName).subscribe({
            next: (response) => {
                console.log('Team created successfully:', response.team);

                // 1. Set team data first so that the userSubscription sees it and doesn't trigger loadTeamData
                const converted = this.convertToTeamData(response.team);
                this.teamData.set(converted);
                // Removed: this.isCaptain is computed automatically

                // 2. Update current user and notify other components
                this.authService.updateCurrentUser(response.updatedUser);
                this.currentUser = response.updatedUser;

                // 3. Reload teams overview to include new team
                this.loadTeamData();

                // 4. Cleanup local UI state
                this.creatingTeam = false;
                this.showCreateTeamForm = false;
                this.showCreateTeamModal = false; // Close modal
                this.newTeamName = '';
                // loading will be set to false in loadTeamData
                this.uiFeedback.success('مبروك!', `تم إنشاء فريق "${response.team.name}" بنجاح.`);
            },
            error: (err) => {
                console.error('Error creating team:', err);
                this.uiFeedback.error('فشل الإنشاء', err.message || 'حدث خطأ أثناء إنشاء الفريق');
                this.creatingTeam = false;
                this.loading.set(false);
            }
        });
    }

    // Modal methods
    openCreateTeamModal(): void {
        this.showCreateTeamModal = true;
        this.newTeamName = '';
        this.cdr.markForCheck();
    }

    closeCreateTeamModal(): void {
        this.showCreateTeamModal = false;
        this.newTeamName = '';
        this.creatingTeam = false;
    }

    handleTabChange(tab: string): void {
        if (!this.teamData()) return;

        queueMicrotask(() => {
            const current = this.teamData();
            if (!current) return;

            switch (tab) {
                case 'players':
                    this.teamService.getTeamPlayers(current.id).subscribe(players => {
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
                        this.teamData.set(updated);
                    });
                    break;
                case 'matches':
                    this.teamService.getTeamMatches(current.id).subscribe((matches: ApiTeamMatch[]) => {
                        const updated: TeamData = {
                            ...current,
                            matches: matches.map((m: ApiTeamMatch) => ({
                                id: m.id,
                                opponent: m.homeTeamId === current.id ? m.awayTeamName : m.homeTeamName,
                                date: new Date(m.date),
                                teamScore: m.homeTeamId === current.id ? m.homeScore : m.awayScore,
                                opponentScore: m.homeTeamId === current.id ? m.awayScore : m.homeScore,
                                status: m.status,
                                type: 'مباراة بطولة',
                                // Optional props mapping
                                opponentLogo: undefined
                            }))
                        };
                        this.teamData.set(updated);
                    });
                    break;
                case 'finances':
                    this.teamService.getTeamFinancials(current.id).subscribe((finances: ApiTeamFinance[]) => {
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
                        this.teamData.set(updated);
                    });
                    break;
                case 'requests':
                    if (this.isCaptain()) {
                        this.teamRequestService.getRequestsForMyTeam().subscribe(requests => {
                            this.teamData.set({ ...current, invitations: requests });
                        });
                    }
                    break;
            }
        });
    }

    private convertToTeamData(team: ExtendedTeam): TeamData {
        return {
            id: team.id,
            name: team.name,
            captainId: team.captainId || '',
            city: team.city || 'غير محدد',
            captainName: team.captainName || 'غير محدد',
            logo: team.logo || 'https://cdn-icons-png.flaticon.com/512/1165/1165217.png',
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
            players: (team.players || []).map((p) => ({
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

    handleRespondRequest(event: { request: TeamJoinRequest, approve: boolean }): void {
        const { request, approve } = event;
        const currentData = this.teamData();
        if (!currentData) return;

        this.teamRequestService.respondToRequest(currentData.id, request.id, approve).subscribe({
            next: () => {
                this.uiFeedback.success(approve ? 'تم القبول' : 'تم الرفض', 'تم تحديث حالة الطلب بنجاح');
                // Refresh invitations list for captain
                this.teamRequestService.getRequestsForMyTeam().subscribe(requests => {
                    const latest = this.teamData();
                    if (latest) {
                        this.teamData.set({ ...latest, invitations: requests });
                    }
                    // If approved, also refresh players list
                    if (approve) {
                        this.loadTeamData();
                    }
                });
            },
            error: (err) => {
                this.uiFeedback.error('فشل المعالجة', err.error?.message || 'حدث خطأ أثناء معالجة الطلب');
            }
        });
    }

    handleEditName(newName: string): void {
        const current = this.teamData();
        if (!current || !newName.trim()) return;

        this.teamService.updateTeam({ id: current.id, name: newName } as Partial<Team>).subscribe({
            next: (updated) => {
                this.teamData.set({ ...current, name: updated.name });
                this.uiFeedback.success('تم التحديث', 'تم تغيير اسم الفريق بنجاح');
            },
            error: () => this.uiFeedback.error('خطأ', 'فشل في تحديث اسم الفريق')
        });
    }

    onAddPlayerClick(playerId: string): void {
        const current = this.teamData();
        if (!current || !this.currentUser) return;

        this.isAddingPlayer = true;
        this.teamService.invitePlayerByDisplayId(current.id, playerId).subscribe({
            next: (response: { playerName: string }) => {
                this.isAddingPlayer = false;
                this.uiFeedback.success('تم إرسال الدعوة', `تم إرسال دعوة للانضمام للبطل "${response.playerName}" بنجاح.`);
                this.showCreateTeamForm = false;
            },
            error: (err: { error?: { message?: string }, message?: string }) => {
                this.isAddingPlayer = false;
                this.uiFeedback.error('فشل الإضافة', err.error?.message || err.message || 'لم يتم العثور على لاعب بهذا الرقم أو أنه مسجل في فريق آخر');
            }
        });
    }

    handlePlayerAction(event: { player: TeamPlayer, action: 'activate' | 'deactivate' | 'ban' | 'remove' }): void {
        const current = this.teamData();
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
            if (confirmed) {
                if (action === 'remove') {
                    this.teamService.removePlayer(current.id, player.id.toString()).subscribe(() => {
                        this.teamData.set({
                            ...current,
                            players: current.players.filter((p) => p.id !== player.id)
                        });
                        this.uiFeedback.success('تم الاستبعاد', 'تم إزالة اللاعب من الفريق');
                    });
                } else {
                    this.uiFeedback.success('تم التحديث', 'تمت العملية بنجاح');
                }
            }
        });
    }

    handleDeleteTeam(): void {
        const current = this.teamData();
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
                        // Update user state and clear team data
                        this.authService.refreshUserProfile().subscribe(() => {
                            this.currentUser = this.authService.getCurrentUser();
                            this.teamData.set(null);
                            // isCaptain computed automatically
                            this.loadInvitations();
                        });
                    },
                    error: (err) => {
                        this.uiFeedback.error('فشل الحذف', err.error?.message || 'حدث خطأ أثناء محاولة حذف الفريق');
                    }
                });
            }
        });
    }
}
