import {
    Component, OnInit, inject, ChangeDetectionStrategy, OnDestroy,
    HostBinding, DestroyRef, computed
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';

// Core
import { ContextNavigationService } from '../../../../core/navigation/context-navigation.service';
import { AuthService } from '../../../../core/services/auth.service';
import { LayoutOrchestratorService } from '../../../../core/services/layout-orchestrator.service';
import { Permission } from '../../../../core/permissions/permissions.model';
import {
    TournamentStatus, MatchStatus, RegistrationStatus, SchedulingMode, TeamRegistration
} from '../../../../core/models/tournament.model';
import { UserStatus } from '../../../../core/models/user.model';

// Store (component-scoped)
import { TournamentDetailStore, DetailTab } from '../../stores/tournament-detail.store';
import { TournamentDetailActions } from '../../stores/tournament-detail-actions.service';

// Shared UI
import { FilterComponent } from '../../../../shared/components/filter/filter.component';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { SmartImageComponent } from '../../../../shared/components/smart-image/smart-image.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';

// Modals
import { TeamRegistrationModalComponent } from '../../components/team-registration-modal/team-registration-modal.component';
import { OpeningMatchModalComponent } from '../../components/opening-match-modal/opening-match-modal.component';

// Tab components
import { InfoTabComponent } from '../../tabs/info-tab/info-tab.component';
import { StandingsTabComponent } from '../../tabs/standings-tab/standings-tab.component';
import { MatchesTabComponent } from '../../tabs/matches-tab/matches-tab.component';
import { BracketTabComponent } from '../../tabs/bracket-tab/bracket-tab.component';
import { TeamsTabComponent } from '../../tabs/teams-tab/teams-tab.component';

// Child components
import { TournamentHeaderComponent } from '../../components/tournament-header/tournament-header.component';
import { TournamentActionsComponent } from '../../components/tournament-actions/tournament-actions.component';
import { TournamentRegistrationsComponent } from '../../components/tournament-registrations/tournament-registrations.component';
import { TournamentMatchesPanelComponent } from '../../components/tournament-matches-panel/tournament-matches-panel.component';

// Utils
import { getTournamentStatusLabel, getRegStatusLabel as _regStatusLabel, getRegStatusType as _regStatusType } from '../../utils/tournament-status.utils';

@Component({
    selector: 'app-tournament-detail',
    standalone: true,
    imports: [
        CommonModule, RouterModule, FormsModule,
        FilterComponent, CardComponent, BadgeComponent, ButtonComponent,
        EmptyStateComponent, SmartImageComponent, IconComponent,
        HasPermissionDirective,
        TeamRegistrationModalComponent, OpeningMatchModalComponent,
        // Tab components (lightweight — each is OnPush standalone)
        InfoTabComponent,
        StandingsTabComponent,
        MatchesTabComponent,
        BracketTabComponent,
        TeamsTabComponent,
        // Child components
        TournamentHeaderComponent,
        TournamentActionsComponent,
        TournamentRegistrationsComponent,
        TournamentMatchesPanelComponent,
    ],
    providers: [TournamentDetailStore, TournamentDetailActions],
    templateUrl: './tournament-detail.component.html',
    styleUrls: ['./tournament-detail.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TournamentDetailComponent implements OnInit, OnDestroy {
    // ── Injections ──
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly authService = inject(AuthService);
    private readonly layoutOrchestrator = inject(LayoutOrchestratorService);
    private readonly navService = inject(ContextNavigationService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly sanitizer = inject(DomSanitizer);

    /** Component-scoped store — injected into all tab children */
    readonly store = inject(TournamentDetailStore);
    private readonly actions = inject(TournamentDetailActions);

    // ── Enums exposed to template ──
    Permission = Permission;
    TournamentStatus = TournamentStatus;
    MatchStatus = MatchStatus;
    RegistrationStatus = RegistrationStatus;
    SchedulingMode = SchedulingMode;

    @HostBinding('style.--progress-val')
    get progressValStyle(): SafeStyle {
        return this.sanitizer.bypassSecurityTrustStyle(this.getProgressPercent().toString());
    }

    // ── Store signal aliases ──
    get isGeneratingMatches() { return this.store.isGeneratingMatches; }
    get isRegisterModalVisible() { return this.store.isRegisterModalVisible; }
    get isOpeningMatchModalVisible() { return this.store.isOpeningMatchModalVisible; }

    // ── Delegated computeds (just aliases into the store) ──
    get tournament() { return this.store.tournament; }
    get isLoading() { return this.store.isLoading; }
    get activeTab() { return this.store.activeTab; }
    get tabs() { return this.store.tabs; }
    get tournamentMatches() { return this.store.tournamentMatches; }
    get myRegistration() { return this.store.myRegistration; }
    get isRegistered() { return this.store.isRegistered; }
    get isCaptain() { return this.store.isCaptain; }
    get canEditTournament() { return this.store.canEditTournament; }
    get canStartRegistration() { return this.store.canStartRegistration; }
    get canCloseRegistration() { return this.store.canCloseRegistration; }
    get canGenerateMatches() { return this.store.canGenerateMatches; }
    get canStartTournament() { return this.store.canStartTournament; }
    get canManageDraw() { return this.store.canManageDraw; }
    get canResetSchedule() { return this.store.canResetSchedule; }
    get canSelectOpeningMatch() { return this.store.canSelectOpeningMatch; }
    get isManualMode() { return this.store.isManualMode; }
    get showStandings() { return this.store.showStandings; }
    get showBracket() { return this.store.showBracket; }

    isUserPending = computed(() => this.authService.getCurrentUser()?.status === UserStatus.PENDING);

    canGenerateSchedule = computed(() => false); // Replaced by automated flow

    // ── Lifecycle ──

    ngOnInit(): void {
        // Read initial tab from query params (persist across refresh)
        const initialTab = this.route.snapshot.queryParamMap.get('tab') as DetailTab | null;
        if (initialTab) {
            this.store.activeTab.set(initialTab);
        }

        // Subscribe to route param changes
        this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
            const id = params.get('id');
            if (id) {
                this.updateLayout();
                this.store.loadTournament(id, this.destroyRef);
            }
        });
    }

    ngOnDestroy(): void {
        this.layoutOrchestrator.reset();
    }

    // ── Tab switching (with query param persistence) ──

    onTabChange(tab: unknown): void {
        const t = tab as DetailTab;
        this.store.setTab(t, this.destroyRef);

        // Update URL query param without triggering navigation
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { tab: t },
            queryParamsHandling: 'merge',
            replaceUrl: true
        });
    }

    // ── Layout ──

    updateLayout(): void {
        const tournament = this.tournament();
        this.layoutOrchestrator.setTitle('تفاصيل البطولة');
        this.layoutOrchestrator.setSubtitle(tournament ? tournament.name : 'تحميل...');
        this.layoutOrchestrator.setBackAction(() => this.navigateBack());
    }

    // ── Navigation ──

    navigateBack(): void {
        const prefix = this.navService.getRootPrefix();
        if (prefix === '/guest') {
            this.router.navigate(['/guest/tournaments']);
            return;
        }
        if (prefix === '/admin' || prefix === '/creator') {
            this.navService.navigateTo('tournaments');
        } else {
            this.router.navigate(['/player/tournaments']);
        }
    }

    // ── Status helpers ──

    getStatusLabel(status: TournamentStatus | undefined): string {
        return getTournamentStatusLabel(status);
    }

    getRegStatusLabel(status: string): string { return _regStatusLabel(status); }
    getRegStatusType(status: string): 'primary' | 'gold' | 'danger' | 'info' | 'warning' | 'success' | 'muted' | 'neutral' | 'live' {
        return _regStatusType(status);
    }

    getProgressPercent(): number {
        const t = this.tournament();
        if (!t?.maxTeams) return 0;
        return (t.currentTeams / t.maxTeams) * 100;
    }

    // ── Actions (thin delegation to store) ──

    editTournament(): void {
        const t = this.tournament();
        if (t) this.navService.navigateTo(['tournaments', 'edit', t.id]);
    }

    startManualDraw(): void {
        const t = this.tournament();
        if (t) this.navService.navigateTo(['tournaments', t.id, 'manual-draw']);
    }

    deleteTournament(): void { this.actions.deleteTournament(); }
    toggleStatus(): void { this.actions.toggleStatus(this.destroyRef); }
    generateMatches(): void { this.actions.generateMatches(this.destroyRef); }
    startTournament(): void { this.actions.startTournament(this.destroyRef); }
    confirmQualification(): void {
        const t = this.tournament();
        if (t) this.navService.navigateTo(['tournaments', t.id, 'manual-qualification']);
    }
    resetSchedule(): void { this.actions.resetSchedule(this.destroyRef); }
    registerTeam(): void { this.actions.registerTeam(); }
    closeRegisterModal(): void { this.actions.closeRegisterModal(); }
    onRegistrationSuccess(registration: TeamRegistration): void { this.actions.onRegistrationSuccess(registration); }
    withdrawTeam(): void { this.actions.withdrawTeam(this.destroyRef); }
    selectOpeningMatch(): void { this.actions.selectOpeningMatch(); }
    closeOpeningMatchModal(): void { this.actions.closeOpeningMatchModal(); }
    onOpeningMatchSelected(event: { homeTeamId: string; awayTeamId: string }): void { this.actions.onOpeningMatchSelected(event, this.destroyRef); }
    emergencyStart(): void { this.actions.emergencyStart(); }
    emergencyEnd(): void { this.actions.emergencyEnd(); }
}
