import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
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
import { LayoutOrchestratorService } from '../../../../core/services/layout-orchestrator.service';
import { Permission } from '../../../../core/permissions/permissions.model';
import { PermissionsService } from '../../../../core/services/permissions.service';
import { TeamRequestService } from '../../../../core/services/team-request.service';
import { TeamJoinRequest } from '../../../../core/models/team-request.model';
import { TeamDetailFacade } from './team-detail-facade.service';
import { computeTeamMatches, computeTeamStats } from './team-detail.utils';

@Component({
    selector: 'app-team-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        TeamDetailComponent
    ],
    providers: [TeamDetailFacade],
    template: `
        <!-- Show content if we have team data, even if still loading/refreshing -->
        @if (teamData()) {
            <app-team-detail 
                [team]="teamData()!"
                [showBackButton]="true"
                [backRoute]="backRoute()"
                [canEditName]="isCaptain()"
                [canAddPlayers]="isCaptain()"
                [canRemovePlayers]="isCaptain() || canManageAdmin()"
                [canManageStatus]="canManageAdmin()"
                [canManageInvitations]="isCaptain()"
                [canDeleteTeam]="canManageAdmin() || isCaptain()"
                [isInviteLoading]="isInviteLoading()"
                (playerAction)="handlePlayerAction($event)"
                (editName)="handleEditName($event)"
                (addPlayer)="handleAddPlayer($event)"
                (addGuestPlayer)="handleAddGuestPlayer($event)"
                (tabChanged)="handleTabChange($event)"
                (deleteTeam)="handleDeleteTeam()"
                (disableTeam)="handleDisableTeam()"
                (activateTeam)="handleActivateTeam()" />
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
    private readonly facade = inject(TeamDetailFacade);

    teamId = signal<string | null>(null);
    isLoading = signal<boolean>(true);
    isInviteLoading = signal<boolean>(false);

    // Permission Signals
    isCaptain = computed(() => {
        const team = this.teamStore.getTeamById(this.teamId() || '');
        const user = this.authService.getCurrentUser();
        return !!(team && user && team.players.some(p =>
            (p.userId === user.id || p.id === user.id) &&
            (p.teamRole === 'Captain' || p.teamRole?.toLowerCase() === 'captain')
        ));
    });

    canManageTeam = computed(() => {
        return this.isCaptain();
    });

    canManageAdmin = computed(() => this.permissionsService.has(Permission.MANAGE_TEAMS));

    backRoute = computed(() => {
        const prefix = this.navService.getRootPrefix();
        if (prefix === '/admin') return '/admin/teams';
        return '/player/team-management';
    });

    // Computed Matches for this team (Real-Time Source of Truth)
    teamMatches = computed(() => {
        const id = this.teamId();
        return id ? computeTeamMatches(id, this.matchStore.matches()) : [];
    });

    // Computed Stats from Matches
    teamStats = computed(() => computeTeamStats(this.teamMatches()));

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
            this.navService.navigateTo('team-management');
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
        this.facade.deleteTeam(t.id, () => this.goToTeamsList());
    }

    handleEditName(newName: string): void {
        const current = this.teamData();
        if (!current || !newName.trim()) return;
        this.facade.editName(current.id, newName);
    }

    handleAddPlayer(displayId: string): void {
        const team = this.teamData();
        if (!team) return;
        this.facade.addPlayer(team.id, displayId, this.isInviteLoading);
    }

    handleAddGuestPlayer(event: { name: string, number?: number, position?: string }): void {
        const team = this.teamData();
        if (!team) return;
        this.facade.addGuestPlayer(team.id, event, this.isInviteLoading, () => this.loadInitialData(team.id));
    }

    handleTabChange(tab: string): void {
        const current = this.teamData();
        if (!current) return;
        this.facade.refreshTabData(current.id, tab);
    }

    handleRespondRequest(event: { request: TeamJoinRequest, approve: boolean }): void {
        const current = this.teamData();
        if (!current) return;
        this.facade.respondToRequest(current.id, event.request.id, event.approve, () => this.loadInitialData(current.id));
    }

    handleDisableTeam(): void {
        const t = this.teamData();
        if (!t) return;
        this.facade.disableTeam(t.id, () => this.loadInitialData(t.id));
    }

    handleActivateTeam(): void {
        const t = this.teamData();
        if (!t) return;
        this.facade.activateTeam(t.id, () => this.loadInitialData(t.id));
    }

    handlePlayerAction(event: { player: TeamPlayer, action: string }): void {
        const t = this.teamData();
        if (!t) return;
        this.facade.playerAction(t.id, event, () => this.loadInitialData(t.id));
    }
}
