import { Injectable, Signal, WritableSignal, inject } from '@angular/core';
import { EMPTY, Subscription, firstValueFrom } from 'rxjs';
import { switchMap, tap, catchError, filter } from 'rxjs/operators';
import { TeamData, TeamPlayer } from '../../../../shared/components/team-detail';
import { TeamService } from '../../../../core/services/team.service';
import { Team } from '../../../../core/models/team.model';
import { AuthService } from '../../../../core/services/auth.service';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { User } from '../../../../core/models/user.model';
import { TeamRequestService } from '../../../../core/services/team-request.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { TeamJoinRequest } from '../../../../core/models/team-request.model';
import { TeamStore } from '../../../../core/stores/team.store';
import { TeamsOverview, convertToTeamData } from './my-teams.utils';
import { MyTeamsActionsService } from './my-teams-actions.service';

export interface MyTeamsFacadeState {
    teamData: WritableSignal<TeamData | null>;
    loading: WritableSignal<boolean>;
    teamsOverview: WritableSignal<TeamsOverview | null>;
    pendingInvitations: WritableSignal<TeamJoinRequest[]>;
    isCaptain: Signal<boolean>;
    getCurrentUser: () => User | null;
    setCurrentUser: (user: User | null) => void;
    markForCheck: () => void;
}

@Injectable()
export class MyTeamsFacadeService {
    private readonly teamService = inject(TeamService);
    private readonly authService = inject(AuthService);
    private readonly uiFeedback = inject(UIFeedbackService);
    private readonly teamRequestService = inject(TeamRequestService);
    private readonly notificationService = inject(NotificationService);
    private readonly teamStore = inject(TeamStore);
    readonly actions = inject(MyTeamsActionsService);

    // Internal state
    isLoadingTeam = false;
    hasLoadingError = false;

    // Component state references (set during init)
    private teamData!: WritableSignal<TeamData | null>;
    private loading!: WritableSignal<boolean>;
    private teamsOverview!: WritableSignal<TeamsOverview | null>;
    private pendingInvitations!: WritableSignal<TeamJoinRequest[]>;
    private isCaptain!: Signal<boolean>;
    private getCurrentUser!: () => User | null;
    private setCurrentUser!: (user: User | null) => void;
    private markForCheck!: () => void;

    init(state: MyTeamsFacadeState): void {
        this.teamData = state.teamData;
        this.loading = state.loading;
        this.teamsOverview = state.teamsOverview;
        this.pendingInvitations = state.pendingInvitations;
        this.isCaptain = state.isCaptain;
        this.getCurrentUser = state.getCurrentUser;
        this.setCurrentUser = state.setCurrentUser;
        this.markForCheck = state.markForCheck;

        // Initialize actions with shared state
        this.actions.init({
            teamData: this.teamData,
            loading: this.loading,
            pendingInvitations: this.pendingInvitations,
            isCaptain: this.isCaptain,
            getCurrentUser: this.getCurrentUser,
            setCurrentUser: this.setCurrentUser,
            markForCheck: this.markForCheck,
            loadTeamData: () => this.loadTeamData(),
            loadInvitations: () => this.loadInvitations(),
        });
    }

    handleUserChange(user: User | null): void {
        const currentData = this.teamData();
        const isLoading = this.isLoadingTeam;
        const teamsOverviewData = this.teamsOverview();

        if (isLoading) return;

        if (!user) {
            if (currentData || teamsOverviewData) {
                this.loadTeamData();
            } else if (this.loading()) {
                queueMicrotask(() => this.loading.set(false));
            }
            return;
        }

        if (!user.teamId) {
            if (currentData || teamsOverviewData) {
                this.loadTeamData();
            } else {
                this.loadTeamData();
            }
            return;
        }

        const storeTeam = this.teamStore.getTeamById(user.teamId);
        const hasError = this.hasLoadingError;

        if (!storeTeam && !teamsOverviewData && !hasError) {
            this.loadTeamData();
        } else if (teamsOverviewData && this.loading()) {
            queueMicrotask(() => this.loading.set(false));
        }
    }

    setupNotificationSubscriptions(): Subscription {
        const subscriptions = new Subscription();

        subscriptions.add(
            this.notificationService.joinRequestUpdate.pipe(
                filter(() => !!this.getCurrentUser()),
                switchMap(() => {
                    const currentData = this.teamData();
                    if (currentData && this.isCaptain()) {
                        this.loadTeamData();
                        return this.teamRequestService.getRequestsForMyTeam().pipe(
                            tap(requests => {
                                const latestData = this.teamData();
                                if (latestData) {
                                    this.teamData.set({ ...latestData, invitations: requests });
                                    this.markForCheck();
                                }
                            })
                        );
                    } else if (!currentData) {
                        return this.authService.refreshUserProfile().pipe(
                            tap(updatedUser => {
                                if (updatedUser?.teamId) {
                                    this.loadTeamData();
                                } else {
                                    this.loadInvitations();
                                }
                                this.markForCheck();
                            }),
                            catchError(() => {
                                this.loadInvitations();
                                this.markForCheck();
                                return EMPTY;
                            })
                        );
                    } else {
                        this.loadInvitations();
                        this.markForCheck();
                        return EMPTY;
                    }
                })
            ).subscribe()
        );

        subscriptions.add(
            this.notificationService.removedFromTeamAndRefresh.pipe(
                switchMap(() => this.authService.refreshUserProfile())
            ).subscribe((updatedUser) => {
                this.setCurrentUser(updatedUser);
                this.loadTeamData();
                this.markForCheck();
            })
        );

        return subscriptions;
    }

    async loadTeamData(): Promise<void> {
        if (this.isLoadingTeam || this.hasLoadingError) return;

        const currentUser = this.getCurrentUser();
        if (!currentUser) {
            this.teamData.set(null);
            this.teamsOverview.set(null);
            this.loading.set(false);
            return;
        }

        this.isLoadingTeam = true;
        this.hasLoadingError = false;

        if (!this.loading()) {
            queueMicrotask(() => this.loading.set(true));
        }

        try {
            const overview = await firstValueFrom(this.teamService.getTeamsOverview()) as TeamsOverview;
            queueMicrotask(async () => {
                this.isLoadingTeam = false;
                this.loading.set(false);
                this.hasLoadingError = false;
                this.teamsOverview.set(overview);
                this.pendingInvitations.set(overview.pendingInvitations);

                let currentTeam: Team | null = null;
                if (overview.ownedTeams.length > 0) {
                    currentTeam = overview.ownedTeams[0];
                } else if (overview.memberTeams.length > 0) {
                    currentTeam = overview.memberTeams[0];
                }

                if (currentTeam) {
                    const existingTeam = this.teamStore.getTeamById(currentTeam.id);
                    if (existingTeam) {
                        this.teamStore.updateTeam(currentTeam);
                    } else {
                        this.teamStore.addTeam(currentTeam);
                    }

                    const converted = convertToTeamData(currentTeam);
                    this.teamData.set(converted);

                    if (currentTeam.players.some(p => p.id === this.getCurrentUser()?.id && p.teamRole === 'Captain')) {
                        try {
                            const requests = await firstValueFrom(this.teamRequestService.getRequestsForMyTeam());
                            const current = this.teamData();
                            if (current) {
                                this.teamData.set({ ...current, invitations: requests });
                            }
                        } catch { /* ignore */ }
                    }
                } else {
                    this.teamData.set(null);
                    this.loadInvitations();
                }
            });
        } catch (err) {
            console.error('Error loading teams overview:', err);
            queueMicrotask(() => {
                this.isLoadingTeam = false;
                this.loading.set(false);
                this.hasLoadingError = true;
                this.teamsOverview.set(null);
                this.teamData.set(null);
                this.uiFeedback.error('خطأ في التحميل', 'فشل في تحميل بيانات الفرق. يرجى المحاولة مرة أخرى.');
            });
        }
    }

    async loadInvitations(): Promise<void> {
        try {
            const invites = await firstValueFrom(this.teamRequestService.getMyInvitations());
            this.pendingInvitations.set(invites);
        } catch { /* ignore */ }
    }

    // ── Delegated actions (forwarded to MyTeamsActionsService) ──

    acceptInvite(requestId: string): Promise<void> { return this.actions.acceptInvite(requestId); }
    rejectInvite(requestId: string): Promise<void> { return this.actions.rejectInvite(requestId); }
    selectTeam(team: Team): void { this.actions.selectTeam(team); }
    navigateToTeamDetail(teamId: string): void { this.actions.navigateToTeamDetail(teamId); }
    createNewTeam(teamName: string): Promise<void> { return this.actions.createNewTeam(teamName); }
    handleTabChange(tab: string): void { this.actions.handleTabChange(tab); }
    handleRespondRequest(event: { request: TeamJoinRequest, approve: boolean }): Promise<void> { return this.actions.handleRespondRequest(event); }
    handleEditName(newName: string): Promise<void> { return this.actions.handleEditName(newName); }
    onAddPlayerClick(playerId: string): Promise<void> { return this.actions.onAddPlayerClick(playerId); }
    handlePlayerAction(event: { player: TeamPlayer, action: 'activate' | 'deactivate' | 'ban' | 'remove' }): Promise<void> { return this.actions.handlePlayerAction(event); }
    handleDeleteTeam(): Promise<void> { return this.actions.handleDeleteTeam(); }

    // ── Forwarded state from actions ──
    get isAddingPlayer() { return this.actions.isAddingPlayer; }
    set isAddingPlayer(v: boolean) { this.actions.isAddingPlayer = v; }
    get creatingTeam() { return this.actions.creatingTeam; }
    set creatingTeam(v: boolean) { this.actions.creatingTeam = v; }
    get showCreateTeamForm() { return this.actions.showCreateTeamForm; }
    set showCreateTeamForm(v: boolean) { this.actions.showCreateTeamForm = v; }
    get showCreateTeamModal() { return this.actions.showCreateTeamModal; }
    set showCreateTeamModal(v: boolean) { this.actions.showCreateTeamModal = v; }
    get newTeamName() { return this.actions.newTeamName; }
    set newTeamName(v: string) { this.actions.newTeamName = v; }
}
