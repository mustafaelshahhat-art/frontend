import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { Component, OnInit, inject, ChangeDetectorRef, signal, computed, effect, OnDestroy, TemplateRef, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ContextNavigationService } from '../../../../core/navigation/context-navigation.service';
import { MatchStore } from '../../../../core/stores/match.store';
import { AuthStore } from '../../../../core/stores/auth.store';
import { MatchService } from '../../../../core/services/match.service';
import { Match, MatchStatus, MatchEventType } from '../../../../core/models/tournament.model';
import { UserRole } from '../../../../core/models/user.model';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { LayoutOrchestratorService } from '../../../../core/services/layout-orchestrator.service';
import { EndMatchConfirmComponent } from '../../components/end-match-confirm/end-match-confirm.component';
import { MatchEventModalComponent } from '../../components/match-event-modal/match-event-modal.component';
import { MatchTimelineComponent } from '../../components/match-timeline/match-timeline.component';
import { Permission } from '../../../../core/permissions/permissions.model';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormControlComponent } from '../../../../shared/components/form-control/form-control.component';
import { MatchDetailFacadeService } from './match-detail-facade.service';
import { getStatusConfig, getEventColor, getEventLabel, getStatusLabel } from './match-detail.utils';

@Component({
    selector: 'app-match-detail',
    standalone: true,
    imports: [
        IconComponent, CommonModule, FormsModule, RouterLink,
        EndMatchConfirmComponent, MatchEventModalComponent, MatchTimelineComponent,
        HasPermissionDirective, ButtonComponent, BadgeComponent, EmptyStateComponent,
        ModalComponent, FormControlComponent
    ],
    providers: [MatchDetailFacadeService],
    templateUrl: './match-detail.component.html',
    styleUrls: ['./match-detail.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MatchDetailComponent implements OnInit, OnDestroy {
    private route = inject(ActivatedRoute);
    private matchService = inject(MatchService);
    private uiFeedback = inject(UIFeedbackService);
    private cdr = inject(ChangeDetectorRef);
    private matchStore = inject(MatchStore);
    private authStore = inject(AuthStore);
    private layoutOrchestrator = inject(LayoutOrchestratorService);
    private navService = inject(ContextNavigationService);
    facade = inject(MatchDetailFacadeService);

    @ViewChild('headerActions') headerActions!: TemplateRef<unknown>;

    matchId = signal<string | null>(null);
    match = computed(() => {
        const id = this.matchId();
        return id ? this.matchStore.getMatchById(id) || null : null;
    });
    isLoading = signal(true);

    // Enums for template
    MatchStatus = MatchStatus;
    MatchEventType = MatchEventType;
    AppPermission = Permission;

    // Modals (component-owned)
    showEventModal = signal(false);
    showEndMatchConfirm = signal(false);

    // Utility functions for template
    getStatusConfig = getStatusConfig;
    getEventColor = getEventColor;
    getEventLabel = getEventLabel;
    getStatusLabel = getStatusLabel;

    get managementModeLabel(): string {
        return this.authStore.userRole() === UserRole.TOURNAMENT_CREATOR ? 'Organization Mode' : 'Admin Mode';
    }

    get managementTitle(): string {
        return this.authStore.userRole() === UserRole.TOURNAMENT_CREATOR ? 'لوحة تحكم المنظم' : 'لوحة التحكم الإدارية';
    }

    constructor() {
        effect(() => {
            const m = this.match();
            if (m) { /* sync hook */ }
        });
    }

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.matchId.set(id);
            this.loadMatch(id);
        } else {
            this.navigateBack();
        }
    }

    private updateLayout(): void {
        const m = this.match();
        if (!m) return;
        this.layoutOrchestrator.setTitle(m.tournamentName || 'تفاصيل المباراة');
        this.layoutOrchestrator.setSubtitle(`${m.homeTeamName} vs ${m.awayTeamName}`);
        this.layoutOrchestrator.setBackAction(() => this.navigateBack());
        this.layoutOrchestrator.setTitleAddon(this.headerActions);
        this.layoutOrchestrator.setActions(null);
        this.layoutOrchestrator.setFilters(null);
    }

    ngOnDestroy(): void {
        this.layoutOrchestrator.reset();
    }

    async loadMatch(id: string): Promise<void> {
        this.isLoading.set(true);
        try {
            const match = await firstValueFrom(this.matchService.getMatchById(id));
            if (match) {
                this.matchStore.updateMatch(match);
                if (!this.matchStore.getMatchById(id)) {
                    this.matchStore.addMatch(match);
                }
                this.updateLayout();
            }
        } catch (e: unknown) {
            this.uiFeedback.error('فشل التحميل', 'تعذّر تحميل بيانات المباراة. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
        } finally {
            this.isLoading.set(false);
            this.cdr.detectChanges();
        }
    }

    navigateBack(): void { this.navService.navigateBack('matches'); }

    getBackRoute(): string { return `${this.navService.getRootPrefix()}/matches`; }

    getChatRoute(): string[] {
        const m = this.match();
        return m ? [this.navService.getRootPrefix(), 'matches', m.id, 'chat'] : [];
    }

    getTeamRoute(teamId: string): string[] {
        return [this.navService.getRootPrefix(), 'teams', teamId];
    }

    // ==================== MATCH MANAGEMENT (delegated to facade) ====================

    startMatch(): void { this.facade.startMatch(this.match()); }
    onEndMatchClick(): void { this.showEndMatchConfirm.set(true); }

    onMatchEnded(updatedMatch: Match): void {
        if (updatedMatch) this.matchStore.upsertMatch(updatedMatch);
        this.cdr.detectChanges();
    }

    openEventModal(): void { this.showEventModal.set(true); }

    onEventAdded(updatedMatch: Match): void {
        if (updatedMatch) this.matchStore.upsertMatch(updatedMatch);
        this.cdr.detectChanges();
    }

    deleteEvent(eventId: string): void { this.facade.deleteEvent(this.match(), eventId); }

    // ==================== ADMIN ACTIONS (delegated to facade) ====================

    openSetScheduleModal(): void { this.facade.openSetScheduleModal(this.match()); }
    openPostponeModal(): void { this.facade.openPostponeModal(); }
    openRescheduleModal(): void { this.facade.openRescheduleModal(); }
    closeScheduleModal(): void { this.facade.closeScheduleModal(); }
    submitScheduleChange(): void { this.facade.submitScheduleChange(this.match()); }
    openCancelModal(): void { this.facade.openCancelModal(); }
    closeCancelModal(): void { this.facade.closeCancelModal(); }
    submitCancellation(): void { this.facade.submitCancellation(this.match()); }
}
