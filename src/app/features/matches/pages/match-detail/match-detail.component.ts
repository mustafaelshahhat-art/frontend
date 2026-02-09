import { Component, OnInit, inject, ChangeDetectorRef, signal, computed, effect, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatchStore } from '../../../../core/stores/match.store';
import { MatchService } from '../../../../core/services/match.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ObjectionsService } from '../../../../core/services/objections.service';
import { UserService } from '../../../../core/services/user.service';
import { LocationService } from '../../../../core/services/location.service';
import { Match, MatchStatus, MatchEventType } from '../../../../core/models/tournament.model';
import { UserRole } from '../../../../core/models/user.model';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { AdminLayoutService } from '../../../../core/services/admin-layout.service';
import { CaptainLayoutService } from '../../../../core/services/captain-layout.service';
import { RefereeLayoutService } from '../../../../core/services/referee-layout.service';
import { EndMatchConfirmComponent } from '../../components/end-match-confirm/end-match-confirm.component';
import { MatchEventModalComponent } from '../../components/match-event-modal/match-event-modal.component';
import { MatchTimelineComponent } from '../../components/match-timeline/match-timeline.component';
import { ObjectionModalComponent } from '../../components/objection-modal/objection-modal.component';

import { Permission } from '../../../../core/permissions/permissions.model';
import { PermissionsService } from '../../../../core/services/permissions.service';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { resolveStatus, StatusConfig } from '../../../../shared/utils/status-labels';
import { SmartImageComponent } from '../../../../shared/components/smart-image/smart-image.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormControlComponent } from '../../../../shared/components/form-control/form-control.component';
import { SelectComponent, SelectOption } from '../../../../shared/components/select/select.component';
import { FileUploadComponent } from '../../../../shared/components/file-upload/file-upload.component';

@Component({
    selector: 'app-match-detail',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        EndMatchConfirmComponent,
        MatchEventModalComponent,
        MatchTimelineComponent,
        ObjectionModalComponent,
        HasPermissionDirective,
        PageHeaderComponent,
        ButtonComponent,
        BadgeComponent,
        EmptyStateComponent,
        SmartImageComponent,
        ModalComponent,
        FormControlComponent,
        SelectComponent
    ],
    templateUrl: './match-detail.component.html',
    styleUrls: ['./match-detail.component.scss']
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
    private objectionsService = inject(ObjectionsService);
    private matchStore = inject(MatchStore);
    private adminLayout = inject(AdminLayoutService);
    private captainLayout = inject(CaptainLayoutService);
    private refereeLayout = inject(RefereeLayoutService);

    @ViewChild('headerActions') headerActions!: TemplateRef<any>;

    // Reactivity
    matchId = signal<string | null>(null);

    // Derived from Store (Single Source of Truth)
    match = computed(() => {
        const id = this.matchId();
        return id ? this.matchStore.getMatchById(id) || null : null;
    });

    // Use local loading state for the initial fetch.
    isLoading = signal(true);

    // Computed visibility for referee-only live match controls
    canShowRefereeControls = computed(() => {
        const currentMatch = this.match();
        if (!currentMatch) return false;
        return this.permissionsService.canManageLiveMatch(currentMatch.status);
    });

    // Computed visibility for player-only objection submission (Finished matches only)
    canShowObjectionSection = computed(() => {
        const currentMatch = this.match();
        if (!currentMatch) return false;
        return this.permissionsService.canSubmitObjection(currentMatch.status);
    });

    // Enums for template
    MatchStatus = MatchStatus;
    MatchEventType = MatchEventType;

    // Modals
    showEventModal = signal(false);
    showEndMatchConfirm = signal(false);

    // Referee: Report modal
    reportNotes = '';
    showReportModal = signal(false);
    isSubmittingReport = signal(false);

    // Admin: Score update
    showScoreModal = signal(false);
    scoreForm = { homeScore: 0, awayScore: 0 };

    showObjectionModal = signal(false);

    isAnyModalOpen = computed(() =>
        this.showEventModal() ||
        this.showEndMatchConfirm() ||
        this.showReportModal() ||
        this.showScoreModal() ||
        this.showObjectionModal() ||
        this.showScheduleModal() ||
        this.showCancelModal() ||
        this.showRefereeModal()
    );

    constructor() {
        // Sync local forms when match updates from Store
        effect(() => {
            const m = this.match();
            if (m) {
                this.scoreForm.homeScore = m.homeScore;
                this.scoreForm.awayScore = m.awayScore;
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

    // Referee Regions
    refereeOptions: SelectOption[] = [];
    selectedRefereeId: string = '';

    // Cascading Locations
    governorateOptions = signal<SelectOption[]>([]);
    cityOptions = signal<SelectOption[]>([]);
    districtOptions = signal<SelectOption[]>([]);
    selectedGovernorate = signal<string>('');
    selectedCity = signal<string>('');
    selectedDistrict = signal<string>('');
    isLocationsLoading = signal<boolean>(false);

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.matchId.set(id);
            this.loadMatch(id);

            // Handle auto-actions from query params
            this.route.queryParams.subscribe(params => {
                if (params['action'] === 'objection') {
                    queueMicrotask(() => this.openObjectionModal());
                }
            });
        } else {
            this.navigateBack();
        }
    }

    private updateLayout(): void {
        const m = this.match();
        if (!m) return;

        const layout = this.getLayout();
        if (layout) {
            layout.setTitle(m.tournamentName || 'تفاصيل المباراة');
            layout.setSubtitle(`${m.homeTeamName} vs ${m.awayTeamName}`);
            layout.setBackAction(() => this.navigateBack());
            layout.setActions(this.headerActions);
        }
    }

    private getLayout(): any {
        if (this.authService.hasRole(UserRole.ADMIN)) return this.adminLayout;
        if (this.authService.getCurrentUser()?.isTeamOwner) return this.captainLayout;
        if (this.authService.hasRole(UserRole.REFEREE)) return this.refereeLayout;
        return null;
    }

    ngOnDestroy(): void {
        this.adminLayout.reset();
        this.captainLayout.reset();
        this.refereeLayout.reset();
    }

    Permission = Permission;

    loadMatch(id: string): void {
        this.isLoading.set(true);
        this.matchService.getMatchById(id).subscribe({
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
                this.uiFeedback.error('خطأ', 'فشل في تحميل بيانات المباراة');
                this.isLoading.set(false);
                this.cdr.detectChanges();
            }
        });
    }

    navigateBack(): void {
        if (this.permissionsService.hasPermission(Permission.MANAGE_MATCHES)) {
            this.router.navigate(['/admin/matches']);
        } else if (this.permissionsService.hasPermission(Permission.START_MATCH)) {
            this.router.navigate(['/referee/matches']);
        } else {
            this.router.navigate(['/captain/matches']);
        }
    }

    getBackRoute(): string {
        if (this.permissionsService.hasPermission(Permission.MANAGE_MATCHES)) return '/admin/matches';
        if (this.permissionsService.hasPermission(Permission.START_MATCH)) return '/referee/matches';
        return '/captain/matches';
    }

    getChatRoute(): any[] {
        const currentMatch = this.match();
        if (!currentMatch) return [];
        if (this.permissionsService.hasPermission(Permission.MANAGE_MATCHES)) return ['/admin/matches', currentMatch.id, 'chat'];
        if (this.permissionsService.hasPermission(Permission.START_MATCH)) return ['/referee/matches', currentMatch.id, 'chat'];
        return ['/captain/matches', currentMatch.id, 'chat'];
    }

    getTeamRoute(teamId: string): string[] {
        if (this.permissionsService.hasPermission(Permission.MANAGE_MATCHES)) return ['/admin/teams', teamId];
        if (this.permissionsService.hasPermission(Permission.START_MATCH)) return ['/referee/teams', teamId];
        return [];
    }

    // ==================== REFEREE ACTIONS ====================

    startMatch(): void {
        const currentMatch = this.match();
        if (!currentMatch) return;
        this.matchService.startMatch(currentMatch.id).subscribe({
            next: (updated) => {
                if (updated) this.matchStore.upsertMatch(updated);
                this.uiFeedback.success('تم البدء', 'انطلقت المباراة الآن! - الوضع المباشر');
                this.cdr.detectChanges();
            },
            error: () => this.uiFeedback.error('خطأ', 'فشل في بدء المباراة')
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

    openReportModal(): void {
        this.showReportModal.set(true);
    }

    closeReportModal(): void {
        this.showReportModal.set(false);
        this.reportNotes = '';
    }

    submitReport(): void {
        const currentMatch = this.match();
        if (!currentMatch) return;

        this.isSubmittingReport.set(true);
        this.matchService.submitMatchReport(
            currentMatch.id,
            this.reportNotes,
            currentMatch.refereeId,
            currentMatch.refereeName
        ).subscribe({
            next: (updated) => {
                if (updated) this.matchStore.upsertMatch(updated);
                this.uiFeedback.success('تم بنجاح', 'تم تقديم تقرير المباراة بنجاح');
                this.isSubmittingReport.set(false);
                this.closeReportModal();
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.uiFeedback.error('خطأ', err.message || 'فشل في تقديم التقرير');
                this.isSubmittingReport.set(false);
                this.cdr.detectChanges();
            }
        });
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
            } as any).subscribe({
                next: (updated) => {
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
            } as any).subscribe({
                next: (updated) => {
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
            } as any).subscribe({
                next: (updated) => {
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

        this.matchService.updateMatchStatus(currentMatch.id, MatchStatus.CANCELLED).subscribe({
            next: (success) => {
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
        ).subscribe((confirmed: boolean) => {
            const currentMatch = this.match();
            if (confirmed && currentMatch) {
                this.matchService.deleteMatchEvent(currentMatch.id, eventId).subscribe({
                    next: (updated) => {
                        if (updated) this.matchStore.upsertMatch(updated);
                        this.uiFeedback.success('تم الحذف', 'تم حذف الحدث وتحديث البيانات');
                        this.cdr.detectChanges();
                    },
                    error: () => this.uiFeedback.error('خطأ', 'فشل في حذف الحدث')
                });
            }
        });
    }

    openRefereeModal(): void {
        this.selectedGovernorate.set('');
        this.selectedCity.set('');
        this.selectedDistrict.set('');
        this.cityOptions.set([]);
        this.districtOptions.set([]);
        this.refereeOptions = [];

        this.loadGovernorates();
        this.showRefereeModal.set(true);
        this.cdr.detectChanges();
    }

    loadGovernorates(): void {
        this.isLocationsLoading.set(true);
        this.locationService.getGovernorates().subscribe({
            next: (govs) => {
                this.governorateOptions.set(govs.map(g => ({ label: g, value: g, icon: 'map' })));
                this.isLocationsLoading.set(false);
                this.cdr.detectChanges();
            },
            error: () => this.isLocationsLoading.set(false)
        });
    }

    onGovernorateChange(gov: any): void {
        this.selectedGovernorate.set(gov);
        this.selectedCity.set('');
        this.selectedDistrict.set('');
        this.cityOptions.set([]);
        this.districtOptions.set([]);
        this.refereeOptions = [];

        if (gov) {
            this.isLocationsLoading.set(true);
            this.locationService.getCities(gov).subscribe({
                next: (cities) => {
                    this.cityOptions.set(cities.map(c => ({ label: c, value: c, icon: 'location_city' })));
                    this.isLocationsLoading.set(false);
                    this.cdr.detectChanges();
                },
                error: () => this.isLocationsLoading.set(false)
            });
        }
    }

    onCityChange(city: any): void {
        this.selectedCity.set(city);
        this.selectedDistrict.set('');
        this.districtOptions.set([]);
        this.refereeOptions = [];

        if (city) {
            this.isLocationsLoading.set(true);
            this.locationService.getDistricts(city).subscribe({
                next: (districts) => {
                    this.districtOptions.set(districts.map(d => ({ label: d, value: d, icon: 'near_me' })));
                    this.isLocationsLoading.set(false);
                    this.cdr.detectChanges();
                },
                error: () => this.isLocationsLoading.set(false)
            });
        }
    }

    onDistrictChange(district: any): void {
        this.selectedDistrict.set(district);
        this.refereeOptions = [];

        if (district) {
            this.isLocationsLoading.set(true);
            this.userService.getReferees(district).subscribe({
                next: (users) => {
                    this.refereeOptions = users.map(u => ({
                        value: u.id,
                        label: u.name,
                        icon: 'person'
                    }));
                    this.isLocationsLoading.set(false);
                    this.cdr.detectChanges();
                },
                error: () => this.isLocationsLoading.set(false)
            });
        }
    }

    showRefereeModal = signal(false);

    closeRefereeModal(): void {
        this.showRefereeModal.set(false);
    }

    assignReferee(): void {
        const currentMatch = this.match();
        if (!currentMatch || !this.selectedRefereeId) return;

        this.matchService.assignReferee(currentMatch.id, this.selectedRefereeId).subscribe({
            next: (updatedMatch) => {
                if (updatedMatch) {
                    this.matchStore.upsertMatch(updatedMatch);
                    this.uiFeedback.success('تم التعيين', `تم تعيين الحكم بنجاح`);
                }
                this.closeRefereeModal();
                this.cdr.detectChanges();
            }
        });
    }

    openScoreModal(): void {
        const currentMatch = this.match();
        if (currentMatch) {
            this.scoreForm.homeScore = currentMatch.homeScore;
            this.scoreForm.awayScore = currentMatch.awayScore;
        }
        this.showScoreModal.set(true);
    }

    closeScoreModal(): void {
        this.showScoreModal.set(false);
    }

    updateScore(): void {
        const currentMatch = this.match();
        if (!currentMatch) return;

        this.matchService.updateMatchScore(currentMatch.id, this.scoreForm.homeScore, this.scoreForm.awayScore)
            .subscribe({
                next: (success: boolean) => {
                    if (success) {
                        const updated = { ...currentMatch, homeScore: this.scoreForm.homeScore, awayScore: this.scoreForm.awayScore };
                        this.matchStore.updateMatch(updated);
                        this.uiFeedback.success('تم بنجاح', 'تم تحديث النتيجة');
                    }
                    this.closeScoreModal();
                    this.cdr.detectChanges();
                },
                error: () => this.uiFeedback.error('خطأ', 'فشل في تحديث النتيجة')
            });
    }

    // ==================== OBJECTION ====================

    openObjectionModal(): void {
        this.showObjectionModal.set(true);
    }

    closeObjectionModal(): void {
        this.showObjectionModal.set(false);
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
