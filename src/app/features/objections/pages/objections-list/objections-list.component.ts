import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, TemplateRef, computed, signal, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ObjectionsService } from '../../../../core/services/objections.service';
import { Objection, ObjectionType, ObjectionStatus } from '../../../../core/models/objection.model';
import { AuthService } from '../../../../core/services/auth.service';
import { AuthStore } from '../../../../core/stores/auth.store';
import { ObjectionStore } from '../../../../core/stores/objection.store';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { UserRole } from '../../../../core/models/user.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { FilterComponent } from '../../../../shared/components/filter/filter.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

import { SelectComponent, SelectOption } from '../../../../shared/components/select/select.component';
import { FormControlComponent } from '../../../../shared/components/form-control/form-control.component';
import { TableComponent, TableColumn } from '../../../../shared/components/table/table.component';
import { PendingStatusCardComponent } from '../../../../shared/components/pending-status-card/pending-status-card.component';

@Component({
    selector: 'app-objections-list',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        EmptyStateComponent,
        FilterComponent,
        PageHeaderComponent,
        CardComponent,
        BadgeComponent,
        ButtonComponent,
        SelectComponent,
        FormControlComponent,
        TableComponent,
        PendingStatusCardComponent
    ],
    templateUrl: './objections-list.component.html',
    styleUrls: ['./objections-list.component.scss']
})
export class ObjectionsListComponent implements OnInit, AfterViewInit {
    private objectionsService = inject(ObjectionsService);
    private authStore = inject(AuthStore);
    private objectionStore = inject(ObjectionStore);
    private uiFeedback = inject(UIFeedbackService);
    private router = inject(Router);
    private cdr = inject(ChangeDetectorRef);

    currentUser = this.authStore.currentUser;
    userRole = this.authStore.userRole;
    isPending = computed(() => this.currentUser()?.status?.toLowerCase() === 'pending');

    objections = this.objectionStore.objections;
    isLoading = this.objectionStore.isLoading;

    showForm = false;
    currentFilter = signal<'all' | 'pending' | 'approved' | 'rejected'>('all');

    filters = [
        { value: 'all', label: 'الكل' },
        { value: 'pending', label: 'قيد المراجعة' },
        { value: 'approved', label: 'مقبولة' },
        { value: 'rejected', label: 'مرفوضة' }
    ];

    ObjectionStatus = ObjectionStatus;

    newObjection = {
        type: ObjectionType.MATCH_RESULT,
        matchId: '',
        description: ''
    };
    ObjectionType = ObjectionType;

    objectionTypeOptions: SelectOption[] = [
        { label: 'نتيجة مباراة', value: ObjectionType.MATCH_RESULT },
        { label: 'قرار حكم', value: ObjectionType.REFEREE_DECISION },
        { label: 'أهلية لاعب', value: ObjectionType.PLAYER_ELIGIBILITY },
        { label: 'أخرى', value: ObjectionType.OTHER }
    ];

    columns: TableColumn[] = [];
    @ViewChild('matchInfo') matchInfo!: TemplateRef<any>;
    @ViewChild('captainInfo') captainInfo!: TemplateRef<any>;
    @ViewChild('dateInfo') dateInfo!: TemplateRef<any>;
    @ViewChild('statusInfo') statusInfo!: TemplateRef<any>;
    @ViewChild('actionInfo') actionInfo!: TemplateRef<any>;
    filteredObjections = computed(() => {
        const obs = this.objections();
        const filter = this.currentFilter();

        if (filter === 'all') return obs;
        if (filter === 'pending') return obs.filter(o => o.status === ObjectionStatus.PENDING || o.status === ObjectionStatus.UNDER_REVIEW || (o.status as any) === 'NEW');
        if (filter === 'approved') return obs.filter(o => o.status === ObjectionStatus.APPROVED);
        if (filter === 'rejected') return obs.filter(o => o.status === ObjectionStatus.REJECTED);
        return obs;
    });

    totalCount = computed(() => this.objections().length);
    pendingCount = computed(() => this.objections().filter(o => o.status === ObjectionStatus.PENDING || (o.status as any) === 'NEW').length);

    ngOnInit(): void {
        this.loadObjections();
    }

    ngAfterViewInit(): void {
        this.columns = [
            { key: 'match', label: 'المباراة', template: this.matchInfo },
            { key: 'captain', label: 'الكابتن', template: this.captainInfo },
            { key: 'date', label: 'التاريخ', template: this.dateInfo },
            { key: 'status', label: 'الحالة', template: this.statusInfo, align: 'center' },
            { key: 'action', label: 'الإجراءات', width: '110px', template: this.actionInfo }
        ];
        this.cdr.detectChanges();
    }

    loadObjections(): void {
        this.objectionStore.setLoading(true);

        const handleSuccess = (data: Objection[]) => {
            this.objectionStore.setObjections(data);
            this.objectionStore.setLoading(false);
            this.cdr.detectChanges();
        };

        const handleError = () => {
            this.objectionStore.setLoading(false);
            this.uiFeedback.error('خطأ', 'فشل في تحميل الاعتراضات');
            this.cdr.detectChanges();
        };

        if (this.isAdmin()) {
            this.objectionsService.getObjections().subscribe({
                next: handleSuccess,
                error: handleError
            });
        } else {
            const teamId = this.currentUser()?.teamId;
            if (teamId) {
                this.objectionsService.getObjectionsByTeam(teamId).subscribe({
                    next: handleSuccess,
                    error: handleError
                });
            } else {
                this.objectionStore.setLoading(false);
                this.cdr.detectChanges();
            }
        }
    }

    setFilter(filter: 'all' | 'pending' | 'approved' | 'rejected'): void {
        this.currentFilter.set(filter);
    }

    get pageTitle(): string {
        return this.isAdmin() ? 'إدارة الاعتراضات' : 'مركز الاعتراضات';
    }

    get pageSubtitle(): string {
        return this.isAdmin()
            ? 'مراجعة الاعتراضات المقدمة واتخاذ القرارات'
            : 'تقديم ومتابعة الاعتراضات الرسمية للجنة المنظمة';
    }

    selectObjection(objection: Objection): void {
        this.router.navigate(['/admin/objections', objection.id]);
    }

    submitObjection(): void {
        if (!this.newObjection.matchId || !this.newObjection.description) {
            this.uiFeedback.warning('تنبيه', 'يرجى ملء جميع الحقول المطلوبة');
            return;
        }

        this.objectionsService.submitObjection({
            matchId: this.newObjection.matchId,
            type: this.newObjection.type,
            description: this.newObjection.description
        }).subscribe({
            next: () => {
                this.uiFeedback.success('تم بنجاح', 'تم تقديم الاعتراض بنجاح');
                this.showForm = false;
                this.newObjection = { type: ObjectionType.MATCH_RESULT, matchId: '', description: '' };
                this.loadObjections();
            },
            error: () => {
                this.uiFeedback.error('خطأ', 'حدث خطأ أثناء تقديم الاعتراض');
            }
        });
    }

    getStatusLabel(status: ObjectionStatus | string): string {
        const labels: Record<string, string> = {
            [ObjectionStatus.PENDING]: 'قيد المراجعة',
            'PENDING': 'جديد',
            [ObjectionStatus.UNDER_REVIEW]: 'تحت الدراسة',
            'UNDER_REVIEW': 'قيد المراجعة',
            [ObjectionStatus.APPROVED]: 'مقبول',
            'APPROVED': 'مقبول',
            [ObjectionStatus.REJECTED]: 'مرفوض',
            'REJECTED': 'مرفوض',
            'NEW': 'جديد'
        };
        return labels[status] || status;
    }

    getStatusColor(status: ObjectionStatus | string): string {
        const colors: Record<string, string> = {
            [ObjectionStatus.PENDING]: '#F59E0B',
            'PENDING': '#F59E0B',
            [ObjectionStatus.UNDER_REVIEW]: '#3B82F6',
            'UNDER_REVIEW': '#3B82F6',
            [ObjectionStatus.APPROVED]: '#10B981',
            'APPROVED': '#10B981',
            [ObjectionStatus.REJECTED]: '#EF4444',
            'REJECTED': '#EF4444',
            'NEW': '#3B82F6'
        };
        return colors[status] || '#64748b';
    }

    getTypeLabel(type: ObjectionType): string {
        const labels: Record<ObjectionType, string> = {
            [ObjectionType.MATCH_RESULT]: 'نتيجة مباراة',
            [ObjectionType.REFEREE_DECISION]: 'قرار حكم',
            [ObjectionType.PLAYER_ELIGIBILITY]: 'أهلية لاعب',
            [ObjectionType.RULE_VIOLATION]: 'مخالفة قوانين',
            [ObjectionType.OTHER]: 'أخرى'
        };
        return labels[type] || type;
    }

    isAdmin(): boolean {
        return this.userRole() === UserRole.ADMIN;
    }

    isCaptain(): boolean {
        return !!this.currentUser()?.isTeamOwner;
    }

    toggleForm(): void {
        this.showForm = true;
    }

    canPerformQuickAction(status: any): boolean {
        return status === ObjectionStatus.PENDING ||
            status === ObjectionStatus.UNDER_REVIEW ||
            status === 'NEW' ||
            status === 'UNDER_REVIEW';
    }

    quickDecision(objection: Objection, status: ObjectionStatus): void {
        const actionText = status === ObjectionStatus.APPROVED ? 'قبول' : 'رفض';
        this.uiFeedback.confirm(
            `${actionText} الاعتراض`,
            `هل أنت متأكد من ${actionText} هذا الاعتراض؟`,
            actionText,
            status === ObjectionStatus.APPROVED ? 'info' : 'danger'
        ).subscribe(confirmed => {
            if (confirmed) {
                this.objectionStore.setLoading(true);
                this.objectionsService.updateObjectionStatus(objection.id, status, '').subscribe({
                    next: (updated) => {
                        this.objectionStore.upsertObjection(updated);
                        this.objectionStore.setLoading(false);
                        this.uiFeedback.success('تم بنجاح', `تم ${actionText} الاعتراض بنجاح.`);
                        this.cdr.detectChanges();
                    },
                    error: () => {
                        this.objectionStore.setLoading(false);
                        this.uiFeedback.error('خطأ', 'فشل في تحديث حالة الاعتراض');
                        this.cdr.detectChanges();
                    }
                });
            }
        });
    }
}
