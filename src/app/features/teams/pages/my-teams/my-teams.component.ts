import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { Component, OnInit, OnDestroy, inject, signal, computed, effect, untracked, ChangeDetectionStrategy, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { TeamData, TeamPlayer } from '../../../../shared/components/team-detail';
import { Team } from '../../../../core/models/team.model';
import { AuthService } from '../../../../core/services/auth.service';
import { User, UserStatus } from '../../../../core/models/user.model';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { TeamJoinRequest } from '../../../../core/models/team-request.model';
import { AuthStore } from '../../../../core/stores/auth.store';
import { LayoutOrchestratorService } from '../../../../core/services/layout-orchestrator.service';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { TeamCardComponent } from '../../components/team-card/team-card.component';
import { CreateTeamDialogComponent } from '../../components/create-team-dialog/create-team-dialog.component';
import { TeamPlayersListComponent } from '../../components/team-players-list/team-players-list.component';
import { JoinRequestsPanelComponent } from '../../components/join-requests-panel/join-requests-panel.component';
import { TeamsOverview } from './my-teams.utils';
import { MyTeamsFacadeService } from './my-teams-facade.service';
import { MyTeamsActionsService } from './my-teams-actions.service';

@Component({
    selector: 'app-my-teams',
    standalone: true,
    imports: [IconComponent,
        CommonModule,
        FormsModule,
        ButtonComponent,
        ModalComponent,
        TeamCardComponent,
        CreateTeamDialogComponent,
        TeamPlayersListComponent,
        JoinRequestsPanelComponent
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './my-teams.component.html',
    styleUrls: ['./my-teams.component.scss'],
    providers: [MyTeamsFacadeService, MyTeamsActionsService]
})
export class MyTeamsComponent implements OnInit, AfterViewInit, OnDestroy {
    private readonly router = inject(Router);
    private readonly authService = inject(AuthService);
    private readonly authStore = inject(AuthStore);
    private readonly layoutOrchestrator = inject(LayoutOrchestratorService);
    private readonly cdr = inject(ChangeDetectorRef);
    readonly facade = inject(MyTeamsFacadeService);

    private subscriptions = new Subscription();
    currentUser: User | null = null;

    // Signals
    teamData = signal<TeamData | null>(null);
    loading = signal<boolean>(true);
    teamsOverview = signal<TeamsOverview | null>(null);
    pendingInvitations = signal<TeamJoinRequest[]>([]);

    // Computed
    isCaptain = computed(() => {
        const team = this.teamData();
        const user = this.authStore.currentUser();
        return !!(team && user && team.players.some(p => p.id === user.id && p.teamRole === 'Captain'));
    });
    isAdmin = computed(() => this.authStore.currentUser()?.role === 'Admin');
    isUserPending = computed(() => this.authStore.currentUser()?.status === UserStatus.PENDING);

    // Template-bound getters for facade UI state
    get creatingTeam(): boolean { return this.facade.creatingTeam; }
    get showCreateTeamModal(): boolean { return this.facade.showCreateTeamModal; }

    constructor() {
        this.facade.init({
            teamData: this.teamData,
            loading: this.loading,
            teamsOverview: this.teamsOverview,
            pendingInvitations: this.pendingInvitations,
            isCaptain: this.isCaptain,
            getCurrentUser: () => this.currentUser,
            setCurrentUser: (u: User | null) => { this.currentUser = u; },
            markForCheck: () => this.cdr.markForCheck(),
        });

        // Reactive effect: Watch Auth state for real-time updates
        effect(() => {
            const user = this.authStore.currentUser();
            untracked(() => {
                this.currentUser = user;
                this.facade.handleUserChange(user);
            });
        });

        // Reactive effect: Update Layout Action Button based on User Status
        effect(() => {
            const isPending = this.isUserPending();
            untracked(() => {
                if (isPending) {
                    this.layoutOrchestrator.setActionHandler(null);
                } else {
                    this.layoutOrchestrator.setActionHandler(() => this.openCreateTeamModal(), 'إنشاء فريق', 'add');
                }
            });
        });
    }

    ngOnInit(): void {
        this.currentUser = this.authService.getCurrentUser();
        if (!this.currentUser) {
            this.router.navigate(['/auth/login']);
            return;
        }
        firstValueFrom(this.authService.refreshUserProfile()).catch(() => {});
        this.facade.loadInvitations();
        this.subscriptions.add(this.facade.setupNotificationSubscriptions());
    }

    ngAfterViewInit(): void {
        this.layoutOrchestrator.setTitle('فريقي');
        this.layoutOrchestrator.setSubtitle('إدارة فرقك والانضمام إلى فرق أخرى');
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
        this.layoutOrchestrator.reset();
    }

    // Thin delegation methods
    loadTeamData(): void { this.facade.loadTeamData(); }
    loadInvitations(): void { this.facade.loadInvitations(); }
    acceptInvite(requestId: string): void { this.facade.acceptInvite(requestId); }
    rejectInvite(requestId: string): void { this.facade.rejectInvite(requestId); }
    navigateToTeamDetail(teamId: string): void { this.facade.navigateToTeamDetail(teamId); }
    selectTeam(team: Team): void { this.facade.selectTeam(team); }
    handleTabChange(tab: string): void { this.facade.handleTabChange(tab); }
    handleRespondRequest(event: { request: TeamJoinRequest, approve: boolean }): void { this.facade.handleRespondRequest(event); }
    handleEditName(newName: string): void { this.facade.handleEditName(newName); }
    onAddPlayerClick(playerId: string): void { this.facade.onAddPlayerClick(playerId); }
    handlePlayerAction(event: { player: TeamPlayer, action: 'activate' | 'deactivate' | 'ban' | 'remove' }): void { this.facade.handlePlayerAction(event); }
    handleDeleteTeam(): void { this.facade.handleDeleteTeam(); }

    // Modal methods
    openCreateTeamModal(): void {
        this.facade.showCreateTeamModal = true;
        this.facade.newTeamName = '';
        this.cdr.markForCheck();
    }

    closeCreateTeamModal(): void {
        this.facade.showCreateTeamModal = false;
        this.facade.newTeamName = '';
        this.facade.creatingTeam = false;
    }

    onCreateTeamFromDialog(teamName: string): void {
        this.facade.createNewTeam(teamName);
    }
}
