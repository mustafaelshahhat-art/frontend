import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { Component, OnInit, inject, ChangeDetectorRef, signal, computed, effect, OnDestroy, TemplateRef, ViewChild, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ContextNavigationService } from '../../../../core/navigation/context-navigation.service';
import { MatchStore } from '../../../../core/stores/match.store';
import { AuthStore } from '../../../../core/stores/auth.store';
import { MatchService } from '../../../../core/services/match.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UserService } from '../../../../core/services/user.service';
import { LocationService } from '../../../../core/services/location.service';
import { Match, MatchStatus, MatchEventType } from '../../../../core/models/tournament.model';
import { UserRole } from '../../../../core/models/user.model';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { LayoutOrchestratorService } from '../../../../core/services/layout-orchestrator.service';
import { EndMatchConfirmComponent } from '../../components/end-match-confirm/end-match-confirm.component';
import { MatchEventModalComponent } from '../../components/match-event-modal/match-event-modal.component';
import { MatchTimelineComponent } from '../../components/match-timeline/match-timeline.component';

import { Permission } from '../../../../core/permissions/permissions.model';
import { PermissionsService } from '../../../../core/services/permissions.service';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { resolveStatus, StatusConfig } from '../../../../shared/utils/status-labels';
import { SmartImageComponent } from '../../../../shared/components/smart-image/smart-image.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormControlComponent } from '../../../../shared/components/form-control/form-control.component';
import { SelectComponent, SelectOption } from '../../../../shared/components/select/select.component';

@Component({
    selector: 'app-match-detail',
    standalone: true,
    imports: [IconComponent,
        CommonModule,
        FormsModule,
        RouterLink,
        EndMatchConfirmComponent,
        MatchEventModalComponent,
        MatchTimelineComponent,
        MatchTimelineComponent,
        HasPermissionDirective,
        ButtonComponent,
        BadgeComponent,
        EmptyStateComponent,
        SmartImageComponent,
        ModalComponent,
        FormControlComponent
    ],
    templateUrl: './match-detail.component.html',
    styleUrls: ['./match-detail.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MatchDetailComponent implements OnInit, OnDestroy {
    // Services
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private matchService = inject(MatchService);
    private authService = inject(AuthService);
    private permissionsService = inject(PermissionsService);
    private locationService = inject(LocationService);
    private uiFeedback = inject(UIFeedbackService);
    private cdr = inject(ChangeDetectorRef);
    private userService = inject(UserService);
    private matchStore = inject(MatchStore);
    private authStore = inject(AuthStore);
    private layoutOrchestrator = inject(LayoutOrchestratorService);
    private navService = inject(ContextNavigationService);
    private destroyRef = inject(DestroyRef);

    @ViewChild('headerActions') headerActions!: TemplateRef<unknown>;

    // Reactivity
    matchId = signal<string | null>(null);

    // Derived from Store (Single Source of Truth)
    match = computed(() => {
        const id = this.matchId();
        return id ? this.matchStore.getMatchById(id) || null : null;
    });

    // Use local loading state for the initial fetch.
    isLoading = signal(true);





    // Enums for template
    MatchStatus = MatchStatus;
    MatchEventType = MatchEventType;
    AppPermission = Permission;

    // Modals
    showEventModal = signal(false);
    showEndMatchConfirm = signal(false);









    get managementModeLabel(): string {
        return this.authStore.userRole() === UserRole.TOURNAMENT_CREATOR ? 'Organization Mode' : 'Admin Mode';
    }

    get managementTitle(): string {
        return this.authStore.userRole() === UserRole.TOURNAMENT_CREATOR ? 'لوحة تحكم المنظم' : 'لوحة التحكم الإدارية';
    }

    constructor() {
        // Sync local forms when match updates from Store
        effect(() => {
            const m = this.match();
            if (m) {
                // No score update sync needed here anymore
            }
        });
    }


    // Admin: Postpone/Reset Schedule Modal
    showScheduleModal = signal(false);
    scheduleType: 'postpone' | 'reset' | 'schedule' = 'postpone';
    scheduleForm = { date: '', time: '' };

    openSetScheduleModal(): void {
        const currentMatch = this.match();
        this.scheduleType = 'schedule';
        if (currentMatch?.date) {
            const dt = new Date(currentMatch.date);
            this.scheduleForm.date = dt.toISOString().split('T')[0];
            this.scheduleForm.time = dt.toTimeString().substring(0, 5);
        }
        this.showScheduleModal.set(true);
    }

    // Admin: Cancel Modal
    showCancelModal = signal(false);
    cancelReason = '';



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
        // Use setTitleAddon to place actions next to the title (Left side in RTL)
        this.layoutOrchestrator.setTitleAddon(this.headerActions);
        this.layoutOrchestrator.setActions(null);
        this.layoutOrchestrator.setFilters(null);
    }

    ngOnDestroy(): void {
        this.layoutOrchestrator.reset();
    }

    loadMatch(id: string): void {
        this.isLoading.set(true);
        this.matchService.getMatchById(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (match) => {
                if (match) {
                    this.matchStore.updateMatch(match);
                    const exists = this.matchStore.getMatchById(id);
                    if (!exists) {
                        this.matchStore.addMatch(match);
                    }
                    this.updateLayout();
                }
                this.isLoading.set(false);
                this.cdr.detectChanges();
            },
            error: () => {
                this.uiFeedback.error('فشل التحميل', 'تعذّر تحميل بيانات المباراة. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
                this.isLoading.set(false);
                this.cdr.detectChanges();
            }
        });
    }

    navigateBack(): void {
        this.navService.navigateBack('matches');
    }

    getBackRoute(): string {
        const root = this.navService.getRootPrefix();
        return `${root}/matches`;
    }

    getChatRoute(): string[] {
        const currentMatch = this.match();
        if (!currentMatch) return [];
        return [this.navService.getRootPrefix(), 'matches', currentMatch.id, 'chat'];
    }

    getTeamRoute(teamId: string): string[] {
        return [this.navService.getRootPrefix(), 'teams', teamId];
    }

    // ==================== MATCH MANAGEMENT ====================

    startMatch(): void {
        const currentMatch = this.match();
        if (!currentMatch) return;
        this.matchService.startMatch(currentMatch.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (updated) => {
                if (updated) this.matchStore.upsertMatch(updated);
                this.uiFeedback.success('تم البدء', 'انطلقت المباراة الآن! - الوضع المباشر');
                this.cdr.detectChanges();
            },
            error: () => this.uiFeedback.error('فشل بدء المباراة', 'تعذّر بدء المباراة. يرجى المحاولة مرة أخرى.')
        });
    }

    onEndMatchClick(): void {
        this.showEndMatchConfirm.set(true);
    }

    onMatchEnded(updatedMatch: Match): void {
        if (updatedMatch) this.matchStore.upsertMatch(updatedMatch);
        this.cdr.detectChanges();
    }

    openEventModal(): void {
        this.showEventModal.set(true);
    }

    onEventAdded(updatedMatch: Match): void {
        if (updatedMatch) this.matchStore.upsertMatch(updatedMatch);
        this.cdr.detectChanges();
    }



    // ==================== ADMIN ACTIONS ====================

    openPostponeModal(): void {
        this.scheduleType = 'postpone';
        this.showScheduleModal.set(true);
    }

    openRescheduleModal(): void {
        this.scheduleType = 'reset';
        this.showScheduleModal.set(true);
    }

    closeScheduleModal(): void {
        this.showScheduleModal.set(false);
        this.scheduleForm = { date: '', time: '' };
    }

    submitScheduleChange(): void {
        const currentMatch = this.match();
        if (!currentMatch || !this.scheduleForm.date || !this.scheduleForm.time) {
            this.uiFeedback.warning('تنبيه', 'يرجى اختيار التاريخ والوقت');
            return;
        }

        const newDate = new Date(`${this.scheduleForm.date}T${this.scheduleForm.time}`);

        if (this.scheduleType === 'postpone') {
            this.matchService.updateMatch(currentMatch.id, {
                date: newDate,
                status: MatchStatus.POSTPONED
            } as Partial<Match>).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
                next: (updated: Match | null) => {
                    if (updated) {
                        this.matchStore.upsertMatch(updated);
                        this.uiFeedback.success('تم التأجيل', 'تم تأجيل المباراة للموعد الجديد');
                    }
                    this.closeScheduleModal();
                    this.cdr.detectChanges();
                }
            });
        } else if (this.scheduleType === 'reset') {
            this.matchService.updateMatch(currentMatch.id, {
                date: newDate,
                status: MatchStatus.RESCHEDULED,
                homeScore: 0,
                awayScore: 0
            } as Partial<Match>).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
                next: (updated: Match | null) => {
                    if (updated) {
                        this.matchStore.upsertMatch(updated);
                        this.uiFeedback.success('تمت الإعادة', 'تم إعادة المباراة وجدولتها في الموعد الجديد');
                    }
                    this.closeScheduleModal();
                    this.cdr.detectChanges();
                }
            });
        } else {
            this.matchService.updateMatch(currentMatch.id, {
                date: newDate
            } as Partial<Match>).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
                next: (updated: Match | null) => {
                    if (updated) {
                        this.matchStore.upsertMatch(updated);
                        this.uiFeedback.success('تم بنجاح', 'تم تحديد موعد اللقاء');
                    }
                    this.closeScheduleModal();
                    this.cdr.detectChanges();
                }
            });
        }
    }

    openCancelModal(): void {
        this.showCancelModal.set(true);
    }

    closeCancelModal(): void {
        this.showCancelModal.set(false);
        this.cancelReason = '';
    }

    submitCancellation(): void {
        const currentMatch = this.match();
        if (!currentMatch || !this.cancelReason.trim()) {
            this.uiFeedback.warning('تنبيه', 'يرجى إدخال سبب الإلغاء');
            return;
        }

        this.matchService.updateMatchStatus(currentMatch.id, MatchStatus.CANCELLED).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (success: boolean) => {
                if (success) {
                    const updated = { ...currentMatch, status: MatchStatus.CANCELLED };
                    this.matchStore.updateMatch(updated);
                    this.uiFeedback.success('تم الإلغاء', 'تم إلغاء المباراة وإرسال إشعارات لجميع الأطراف');
                }
                this.closeCancelModal();
                this.cdr.detectChanges();
            }
        });
    }

    deleteEvent(eventId: string): void {
        this.uiFeedback.confirm(
            'حذف الحدث',
            'هل أنت متأكد من رغبتك في حذف هذا الحدث؟ ستتم استعادة الأهداف (إن وجدت) وتحديث إحصائيات المباراة.',
            'حذف الحدث',
            'danger'
        ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((confirmed: boolean) => {
            const currentMatch = this.match();
            if (confirmed && currentMatch) {
                this.matchService.deleteMatchEvent(currentMatch.id, eventId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
                    next: (updated: Match | null) => {
                        if (updated) this.matchStore.upsertMatch(updated);
                        this.uiFeedback.success('تم الحذف', 'تم حذف الحدث وتحديث البيانات');
                        this.cdr.detectChanges();
                    },
                    error: () => this.uiFeedback.error('فشل الحذف', 'تعذّر حذف الحدث. يرجى المحاولة مرة أخرى.')
                });
            }
        });
    }







    // ==================== HELPERS ====================

    getEventColor(type: MatchEventType | string | undefined): string {
        const variant = resolveStatus('match-event', type as string).variant;
        const colorMap: Record<string, string> = {
            success: 'var(--color-success)',
            warning: 'var(--color-warning)',
            danger: 'var(--color-danger)',
            info: 'var(--color-info)',
            primary: 'var(--color-primary)',
            gold: 'var(--color-gold)',
            muted: 'var(--text-muted)'
        };
        return colorMap[variant as string] || 'var(--text-muted)';
    }

    getEventLabel(type: MatchEventType | string | undefined): string {
        return resolveStatus('match-event', type as string).label;
    }

    getStatusLabel(status: MatchStatus): string {
        return resolveStatus('match', status).label;
    }

    getStatusConfig(status: MatchStatus): StatusConfig {
        return resolveStatus('match', status);
    }
}
