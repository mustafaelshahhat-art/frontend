import { Component, OnInit, inject, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatchService } from '../../../../core/services/match.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ObjectionsService } from '../../../../core/services/objections.service';
import { UserService } from '../../../../core/services/user.service';
import { Match, MatchStatus, MatchEventType } from '../../../../core/models/tournament.model';
import { UserRole } from '../../../../core/models/user.model';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { EndMatchConfirmComponent } from '../../components/end-match-confirm/end-match-confirm.component';
import { MatchEventModalComponent } from '../../components/match-event-modal/match-event-modal.component';
import { MatchTimelineComponent } from '../../components/match-timeline/match-timeline.component';

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
        HasPermissionDirective,
        PageHeaderComponent,
        ButtonComponent,
        BadgeComponent,
        EmptyStateComponent,
        SmartImageComponent,
        ModalComponent,
        FormControlComponent,
        SelectComponent,
        FileUploadComponent
    ],
    templateUrl: './match-detail.component.html',
    styleUrls: ['./match-detail.component.scss']
})
export class MatchDetailComponent implements OnInit {
    // Services
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private matchService = inject(MatchService);
    private authService = inject(AuthService);
    private permissionsService = inject(PermissionsService);
    private uiFeedback = inject(UIFeedbackService);
    private cdr = inject(ChangeDetectorRef);
    private userService = inject(UserService);
    private objectionsService = inject(ObjectionsService);

    match = signal<Match | null>(null);
    isLoading = signal(true);

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

    // Objection Modal
    showObjectionModal = signal(false);
    objectionForm = {
        type: '',
        description: '',
        files: [] as File[]
    };
    objectionTypeOptions: SelectOption[] = [
        { value: 'MatchResult', label: 'نتيجة المباراة', icon: 'scoreboard' },
        { value: 'RefereeDecision', label: 'قرار تحكيمي', icon: 'sports' },
        { value: 'PlayerEligibility', label: 'أهلية لاعب', icon: 'person_off' },
        { value: 'RuleViolation', label: 'مخالفة قوانين', icon: 'gavel' },
        { value: 'Other', label: 'أخرى', icon: 'more_horiz' }
    ];

    // Admin: Postpone/Reset Schedule Modal
    showScheduleModal = signal(false);
    scheduleType: 'postpone' | 'reset' = 'postpone';
    scheduleForm = { date: '', time: '' };

    // Admin: Cancel Modal
    showCancelModal = signal(false);
    cancelReason = '';

    // Admin: Delete Event Confirm
    pendingDeleteEventId: string | null = null;

    // Referee Regions
    refereeOptions: SelectOption[] = [];
    selectedRefereeId: string = '';

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.loadMatch(id);
        } else {
            this.navigateBack();
        }
    }

    // Role checks removed - use permissions
    Permission = Permission;

    loadMatch(id: string): void {
        this.isLoading.set(true);
        this.matchService.getMatchById(id).subscribe({
            next: (match) => {
                const finalMatch = match ?? null;
                if (finalMatch) {
                    this.scoreForm.homeScore = finalMatch.homeScore;
                    this.scoreForm.awayScore = finalMatch.awayScore;
                    if (!finalMatch.events) {
                        finalMatch.events = [];
                    }
                }
                this.match.set(finalMatch);
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
            next: (updatedMatch) => {
                if (updatedMatch) {
                    this.match.set({ ...updatedMatch }); // Force reference change
                }
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
        if (updatedMatch) {
            this.match.set(updatedMatch);
        }
        this.cdr.detectChanges();
    }

    openEventModal(): void {
        this.showEventModal.set(true);
    }

    onEventAdded(updatedMatch: Match): void {
        if (updatedMatch) {
            this.match.set(updatedMatch);
        }
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
            next: (updatedMatch) => {
                if (updatedMatch) this.match.set(updatedMatch);
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

    openResetModal(): void {
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
            this.matchService.postponeMatch(currentMatch.id).subscribe(() => {
                this.match.update((m: Match | null) => {
                    if (m) {
                        return { ...m, status: MatchStatus.POSTPONED, date: newDate };
                    }
                    return m;
                });
                this.uiFeedback.success('تم التأجيل', 'تم تأجيل المباراة للموعد الجديد');
                this.closeScheduleModal();
                this.cdr.detectChanges();
            });
        } else {
            this.matchService.resetMatch(currentMatch.id).subscribe((updated) => {
                if (updated) {
                    this.match.set({ ...updated, date: newDate });
                    this.uiFeedback.success('تمت الإعادة', 'تم إعادة المباراة وجدولتها في الموعد الجديد');
                }
                this.closeScheduleModal();
                this.cdr.detectChanges();
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
                    this.match.update((m: Match | null) => m ? { ...m, status: MatchStatus.CANCELLED } : m);
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
                const eventToDelete = currentMatch.events?.find((e: any) => e.id === eventId);

                this.match.update((m: Match | null) => {
                    if (!m) return m;
                    let homeScore = m.homeScore;
                    let awayScore = m.awayScore;

                    if (eventToDelete && eventToDelete.type === MatchEventType.GOAL) {
                        if (eventToDelete.teamId === m.homeTeamId) homeScore--;
                        else awayScore--;
                    }

                    return {
                        ...m,
                        homeScore,
                        awayScore,
                        events: m.events?.filter((e: any) => e.id !== eventId)
                    };
                });

                this.uiFeedback.success('تم الحذف', 'تم حذف الحدث وتحديث البيانات');
                this.cdr.detectChanges();
            }
        });
    }

    // Referee Modal
    showRefereeModal = signal(false);

    openRefereeModal(): void {
        this.userService.getUsersByRole('Referee').subscribe({
            next: (users) => {
                this.refereeOptions = users.map(u => ({
                    value: u.id,
                    label: u.name,
                    icon: 'person'
                }));
                // Sort by region logic if needed (requires fetching regions or adding to user model)
                this.showRefereeModal.set(true);
                this.cdr.detectChanges();
            },
            error: () => {
                this.uiFeedback.error('خطأ', 'فشل في تحميل قائمة الحكام');
            }
        });
    }

    closeRefereeModal(): void {
        this.showRefereeModal.set(false);
    }

    assignReferee(): void {
        const currentMatch = this.match();
        if (!currentMatch || !this.selectedRefereeId) return;
        const selectedRef = this.refereeOptions.find(ref => ref.value === this.selectedRefereeId);

        this.matchService.assignReferee(currentMatch.id, this.selectedRefereeId, selectedRef?.label || '').subscribe({
            next: (updatedMatch) => {
                if (updatedMatch) {
                    this.match.set(updatedMatch);
                    this.uiFeedback.success('تم التعيين', `تم تعيين الحكم: ${selectedRef?.label}`);
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
                        this.match.update((m: Match | null) => m ? { ...m, homeScore: this.scoreForm.homeScore, awayScore: this.scoreForm.awayScore } : m);
                        this.uiFeedback.success('تم بنجاح', 'تم تحديث النتيجة');
                    }
                    this.closeScoreModal();
                    this.cdr.detectChanges();
                },
                error: () => this.uiFeedback.error('خطأ', 'فشل في تحديث النتيجة')
            });
    }

    // ==================== HELPERS ====================

    getEventIcon(type: MatchEventType | string | undefined): string {
        return resolveStatus('match-event', type as string).icon || 'info';
    }

    getEventColor(type: MatchEventType | string | undefined): string {
        const variant = resolveStatus('match-event', type as string).variant;
        // Map badge variants to CSS variables directly
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

    // ==================== OBJECTION ====================

    openObjectionModal(): void {
        this.objectionForm = {
            type: '',
            description: '',
            files: []
        };
        this.showObjectionModal.set(true);
    }

    closeObjectionModal(): void {
        this.showObjectionModal.set(false);
    }

    onFilesSelected(files: File[]): void {
        this.objectionForm.files = files;
    }

    submitObjection(): void {
        const currentMatch = this.match();
        if (!currentMatch || !this.objectionForm.type || !this.objectionForm.description) {
            this.uiFeedback.warning('تنبيه', 'يرجى ملء جميع الحقول المطلوبة');
            return;
        }

        const request = {
            matchId: currentMatch.id,
            type: this.objectionForm.type,
            description: this.objectionForm.description
        };

        this.objectionsService.submitObjection(request).subscribe({
            next: () => {
                this.uiFeedback.success('تم بنجاح', 'تم تقديم الاعتراض بنجاح');
                this.closeObjectionModal();
                this.objectionForm = { type: '', description: '', files: [] };
            },
            error: () => {
                this.uiFeedback.error('خطأ', 'فشل في تقديم الاعتراض');
            }
        });
    }
}
