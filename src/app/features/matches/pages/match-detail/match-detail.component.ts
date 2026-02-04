import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatchService } from '../../../../core/services/match.service';
import { AuthService } from '../../../../core/services/auth.service';
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
        EmptyStateComponent
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

    match: Match | null = null;
    isLoading = true;

    // Enums for template
    MatchStatus = MatchStatus;
    MatchEventType = MatchEventType;

    // Modals
    showEventModal = false;
    showEndMatchConfirm = false;

    // Referee: Report modal
    reportNotes = '';
    showReportModal = false;
    isSubmittingReport = false;

    // Admin: Score update
    showScoreModal = false;
    scoreForm = { homeScore: 0, awayScore: 0 };

    // Objection Modal
    showObjectionModal = false;
    objectionDropdownOpen = false;
    objectionForm = {
        type: '',
        description: '',
        files: [] as File[]
    };
    objectionTypes = [
        { value: 'MATCH_RESULT', label: 'نتيجة المباراة', icon: 'scoreboard' },
        { value: 'REFEREE_DECISION', label: 'قرار تحكيمي', icon: 'sports' },
        { value: 'PLAYER_ELIGIBILITY', label: 'أهلية لاعب', icon: 'person_off' },
        { value: 'RULE_VIOLATION', label: 'مخالفة قوانين', icon: 'gavel' },
        { value: 'OTHER', label: 'أخرى', icon: 'more_horiz' }
    ];

    // Admin: Postpone/Reset Schedule Modal
    showScheduleModal = false;
    scheduleType: 'postpone' | 'reset' = 'postpone';
    scheduleForm = { date: '', time: '' };

    // Admin: Cancel Modal
    showCancelModal = false;
    cancelReason = '';

    // Admin: Delete Event Confirm
    pendingDeleteEventId: string | null = null;

    // Referee Regions (Mock)
    referees = [
        { id: 'ref1', name: 'محمد الحكم', region: 'الرياض' },
        { id: 'ref2', name: 'أحمد سعيد', region: 'جدة' },
        { id: 'ref3', name: 'فهد العامر', region: 'الدمام' },
        { id: 'ref4', name: 'سلطان القحطاني', region: 'الرياض' }
    ];

    get filteredReferees() {
        if (!this.match) return this.referees;
        // Mock team regions
        const homeTeamRegion = 'الرياض'; // This would normally come from team model
        return this.referees.sort((a, b) => {
            if (a.region === homeTeamRegion && b.region !== homeTeamRegion) return -1;
            if (a.region !== homeTeamRegion && b.region === homeTeamRegion) return 1;
            return 0;
        });
    }

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
        this.isLoading = true;
        this.matchService.getMatchById(id).subscribe({
            next: (match) => {
                this.match = match ?? null;
                if (this.match) {
                    this.scoreForm.homeScore = this.match.homeScore;
                    this.scoreForm.awayScore = this.match.awayScore;
                    if (!this.match.events) {
                        this.match.events = [];
                    }
                }
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.uiFeedback.error('خطأ', 'فشل في تحميل بيانات المباراة');
                this.isLoading = false;
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

    getChatRoute(): string[] {
        if (!this.match) return [];
        if (this.permissionsService.hasPermission(Permission.MANAGE_MATCHES)) return ['/admin/matches', this.match.id, 'chat'];
        if (this.permissionsService.hasPermission(Permission.START_MATCH)) return ['/referee/matches', this.match.id, 'chat'];
        return ['/captain/matches', this.match.id, 'chat'];
    }

    // ==================== REFEREE ACTIONS ====================

    startMatch(): void {
        if (!this.match) return;
        this.matchService.startMatch(this.match.id).subscribe({
            next: (updatedMatch) => {
                if (updatedMatch) {
                    this.match = { ...updatedMatch }; // Force reference change
                }
                this.uiFeedback.success('تم البدء', 'انطلقت المباراة الآن! - الوضع المباشر');
                this.cdr.detectChanges();
            },
            error: () => this.uiFeedback.error('خطأ', 'فشل في بدء المباراة')
        });
    }

    onEndMatchClick(): void {
        this.showEndMatchConfirm = true;
    }

    onMatchEnded(updatedMatch: Match): void {
        if (updatedMatch) {
            this.match = updatedMatch;
        }
        this.cdr.detectChanges();
    }

    openEventModal(): void {
        this.showEventModal = true;
    }

    onEventAdded(updatedMatch: Match): void {
        if (updatedMatch) {
            this.match = updatedMatch;
        }
        this.cdr.detectChanges();
    }

    openReportModal(): void {
        this.showReportModal = true;
    }

    closeReportModal(): void {
        this.showReportModal = false;
        this.reportNotes = '';
    }

    submitReport(): void {
        if (!this.match) return;

        this.isSubmittingReport = true;
        this.matchService.submitMatchReport(
            this.match.id,
            this.reportNotes,
            this.match.refereeId,
            this.match.refereeName
        ).subscribe({
            next: (updatedMatch) => {
                if (updatedMatch) this.match = updatedMatch;
                this.uiFeedback.success('تم بنجاح', 'تم تقديم تقرير المباراة بنجاح');
                this.isSubmittingReport = false;
                this.closeReportModal();
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.uiFeedback.error('خطأ', err.message || 'فشل في تقديم التقرير');
                this.isSubmittingReport = false;
                this.cdr.detectChanges();
            }
        });
    }

    // ==================== ADMIN ACTIONS ====================

    openPostponeModal(): void {
        this.scheduleType = 'postpone';
        this.showScheduleModal = true;
    }

    openResetModal(): void {
        this.scheduleType = 'reset';
        this.showScheduleModal = true;
    }

    closeScheduleModal(): void {
        this.showScheduleModal = false;
        this.scheduleForm = { date: '', time: '' };
    }

    submitScheduleChange(): void {
        if (!this.match || !this.scheduleForm.date || !this.scheduleForm.time) {
            this.uiFeedback.warning('تنبيه', 'يرجى اختيار التاريخ والوقت');
            return;
        }

        const newDate = new Date(`${this.scheduleForm.date}T${this.scheduleForm.time}`);

        if (this.scheduleType === 'postpone') {
            this.matchService.postponeMatch(this.match.id).subscribe(() => {
                if (this.match) {
                    this.match.status = MatchStatus.POSTPONED;
                    this.match.date = newDate;
                    this.uiFeedback.success('تم التأجيل', 'تم تأجيل المباراة للموعد الجديد');
                }
                this.closeScheduleModal();
                this.cdr.detectChanges();
            });
        } else {
            this.matchService.resetMatch(this.match.id).subscribe((updated) => {
                if (updated) {
                    this.match = { ...updated, date: newDate };
                    this.uiFeedback.success('تمت الإعادة', 'تم إعادة المباراة وجدولتها في الموعد الجديد');
                }
                this.closeScheduleModal();
                this.cdr.detectChanges();
            });
        }
    }

    openCancelModal(): void {
        this.showCancelModal = true;
    }

    closeCancelModal(): void {
        this.showCancelModal = false;
        this.cancelReason = '';
    }

    submitCancellation(): void {
        if (!this.match || !this.cancelReason.trim()) {
            this.uiFeedback.warning('تنبيه', 'يرجى إدخال سبب الإلغاء');
            return;
        }

        this.matchService.updateMatchStatus(this.match.id, MatchStatus.CANCELLED).subscribe({
            next: (success) => {
                if (success && this.match) {
                    this.match.status = MatchStatus.CANCELLED;
                    this.uiFeedback.success('تم الإلغاء', 'تم إلغاء المباراة وإرسال إشعارات لجميع الأطراف');
                    console.log('Notification sent to Participants:', {
                        reason: this.cancelReason,
                        matchId: this.match.id,
                        homeTeamId: this.match.homeTeamId,
                        awayTeamId: this.match.awayTeamId,
                        refereeId: this.match.refereeId
                    });
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
            if (confirmed && this.match) {
                const eventToDelete = this.match.events?.find(e => e.id === eventId);

                if (eventToDelete && eventToDelete.type === MatchEventType.GOAL) {
                    if (eventToDelete.teamId === this.match.homeTeamId) this.match.homeScore--;
                    else this.match.awayScore--;
                }

                this.match.events = this.match.events?.filter(e => e.id !== eventId);
                this.uiFeedback.success('تم الحذف', 'تم حذف الحدث وتحديث البيانات');
                this.cdr.detectChanges();
            }
        });
    }

    // Referee Modal
    showRefereeModal = false;

    openRefereeModal(): void {
        this.showRefereeModal = true;
    }

    closeRefereeModal(): void {
        this.showRefereeModal = false;
    }

    assignReferee(referee: { id: string, name: string }): void {
        if (!this.match) return;
        this.matchService.assignReferee(this.match.id, referee.id, referee.name).subscribe({
            next: (updatedMatch) => {
                if (updatedMatch) {
                    this.match = updatedMatch;
                    this.uiFeedback.success('تم التعيين', `تم تعيين الحكم: ${referee.name}`);
                }
                this.closeRefereeModal();
                this.cdr.detectChanges();
            }
        });
    }

    openScoreModal(): void {
        if (this.match) {
            this.scoreForm.homeScore = this.match.homeScore;
            this.scoreForm.awayScore = this.match.awayScore;
        }
        this.showScoreModal = true;
    }

    closeScoreModal(): void {
        this.showScoreModal = false;
    }

    updateScore(): void {
        if (!this.match) return;

        this.matchService.updateMatchScore(this.match.id, this.scoreForm.homeScore, this.scoreForm.awayScore)
            .subscribe({
                next: (success: boolean) => {
                    if (success) {
                        if (this.match) {
                            this.match.homeScore = this.scoreForm.homeScore;
                            this.match.awayScore = this.scoreForm.awayScore;
                        }
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
        if (!type) return 'info';
        const typeStr = typeof type === 'string' ? type.toLowerCase() : type;
        switch (typeStr) {
            case MatchEventType.GOAL:
            case 'goal': return 'sports_soccer';
            case MatchEventType.YELLOW_CARD:
            case 'yellow_card':
            case 'yellow': return 'content_copy';
            case MatchEventType.RED_CARD:
            case 'red_card':
            case 'red': return 'content_copy';
            case MatchEventType.PENALTY:
            case 'penalty': return 'sports_soccer';
            default: return 'info';
        }
    }

    getEventColor(type: MatchEventType | string | undefined): string {
        if (!type) return '#64748b';
        const typeStr = typeof type === 'string' ? type.toLowerCase() : type;
        switch (typeStr) {
            case MatchEventType.GOAL:
            case 'goal': return '#10B981';
            case MatchEventType.YELLOW_CARD:
            case 'yellow_card':
            case 'yellow': return '#F59E0B';
            case MatchEventType.RED_CARD:
            case 'red_card':
            case 'red': return '#EF4444';
            default: return '#64748b';
        }
    }

    getEventLabel(type: MatchEventType | string | undefined): string {
        if (!type) return 'حدث';
        const typeStr = typeof type === 'string' ? type.toLowerCase() : type;
        switch (typeStr) {
            case MatchEventType.GOAL:
            case 'goal': return 'هدف';
            case MatchEventType.YELLOW_CARD:
            case 'yellow_card':
            case 'yellow': return 'بطاقة صفراء';
            case MatchEventType.RED_CARD:
            case 'red_card':
            case 'red': return 'بطاقة حمراء';
            case MatchEventType.PENALTY:
            case 'penalty': return 'ركلة جزاء';
            case MatchEventType.OWN_GOAL:
            case 'own_goal': return 'هدف بالخطأ';
            default: return 'حدث';
        }
    }

    getStatusLabel(status: MatchStatus): string {
        switch (status) {
            case MatchStatus.LIVE: return 'مباشر الآن';
            case MatchStatus.FINISHED: return 'منتهية';
            case MatchStatus.SCHEDULED: return 'مجدولة';
            case MatchStatus.HALFTIME: return 'استراحة';
            case MatchStatus.CANCELLED: return 'ملغية';
            case MatchStatus.POSTPONED: return 'مؤجلة';
            default: return 'غير معروف';
        }
    }

    // ==================== OBJECTION ====================

    openObjectionModal(): void {
        this.objectionForm = {
            type: '',
            description: '',
            files: []
        };
        this.objectionDropdownOpen = false;
        this.showObjectionModal = true;
    }

    closeObjectionModal(): void {
        this.showObjectionModal = false;
        this.objectionDropdownOpen = false;
    }

    getObjectionIcon(type: string): string {
        const found = this.objectionTypes.find(t => t.value === type);
        return found?.icon || 'help';
    }

    getObjectionLabel(type: string): string {
        const found = this.objectionTypes.find(t => t.value === type);
        return found?.label || '';
    }

    onFilesSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files) {
            this.addFiles(Array.from(input.files));
        }
    }

    onFileDrop(event: DragEvent): void {
        event.preventDefault();
        if (event.dataTransfer?.files) {
            this.addFiles(Array.from(event.dataTransfer.files));
        }
    }

    addFiles(files: File[]): void {
        const validFiles = files.filter(file => {
            const isImage = file.type.startsWith('image/');
            const isVideo = file.type.startsWith('video/');
            const maxSize = 50 * 1024 * 1024; // 50MB
            return (isImage || isVideo) && file.size <= maxSize;
        });
        this.objectionForm.files.push(...validFiles);
    }

    removeFile(index: number): void {
        this.objectionForm.files.splice(index, 1);
    }

    formatFileSize(bytes: number): string {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    submitObjection(): void {
        if (!this.objectionForm.type || !this.objectionForm.description) {
            this.uiFeedback.warning('تنبيه', 'يرجى ملء جميع الحقول المطلوبة');
            return;
        }

        // Here you would normally send to API
        console.log('Submitting objection:', {
            matchId: this.match?.id,
            type: this.objectionForm.type,
            description: this.objectionForm.description,
            filesCount: this.objectionForm.files.length
        });

        this.uiFeedback.success('تم بنجاح', 'تم تقديم الاعتراض بنجاح');
        this.closeObjectionModal();
    }
}
