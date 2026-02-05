import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ObjectionsService } from '../../../../core/services/objections.service';
import { Objection, ObjectionType, ObjectionStatus } from '../../../../core/models/objection.model';
import { AuthService } from '../../../../core/services/auth.service';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { UserRole } from '../../../../core/models/user.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { FilterComponent } from '../../../../shared/components/filter/filter.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

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
        ButtonComponent
    ],
    templateUrl: './objections-list.component.html',
    styleUrls: ['./objections-list.component.scss']
})
export class ObjectionsListComponent implements OnInit {
    private objectionsService = inject(ObjectionsService);
    private authService = inject(AuthService);
    private uiFeedback = inject(UIFeedbackService);
    private router = inject(Router);
    private cdr = inject(ChangeDetectorRef);

    currentUser = this.authService.getCurrentUser();
    userRole = this.currentUser?.role || UserRole.CAPTAIN;

    objections: Objection[] = [];
    filteredObjections: Objection[] = [];
    selectedObjection: Objection | null = null;
    isLoading = true;
    showForm = false;
    totalCount = 0;

    currentFilter: 'all' | 'pending' | 'approved' | 'rejected' = 'all';

    filters = [
        { value: 'all', label: 'الكل' },
        { value: 'pending', label: 'قيد المراجعة' },
        { value: 'approved', label: 'مقبولة' },
        { value: 'rejected', label: 'مرفوضة' }
    ];

    ObjectionStatus = ObjectionStatus;

    // Captain: new objection form
    newObjection = {
        type: ObjectionType.MATCH_RESULT,
        matchId: '',
        description: ''
    };
    ObjectionType = ObjectionType;

    ngOnInit(): void {
        this.loadObjections();
    }

    loadObjections(): void {
        this.isLoading = true;

        if (this.isAdmin()) {
            this.objectionsService.getObjections().subscribe({
                next: (data) => this.handleObjectionsLoaded(data),
                error: () => this.handleLoadError()
            });
        } else {
            const teamId = this.currentUser?.teamId;
            if (teamId) {
                this.objectionsService.getObjectionsByTeam(teamId).subscribe({
                    next: (data) => this.handleObjectionsLoaded(data),
                    error: () => this.handleLoadError()
                });
            } else {
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        }
    }

    private handleObjectionsLoaded(data: Objection[]): void {
        this.objections = data;
        this.totalCount = data.length;
        this.applyFilter();
        this.isLoading = false;
        this.cdr.detectChanges();
    }

    private handleLoadError(): void {
        this.isLoading = false;
        this.uiFeedback.error('خطأ', 'فشل في تحميل الاعتراضات');
        this.cdr.detectChanges();
    }

    setFilter(filter: 'all' | 'pending' | 'approved' | 'rejected'): void {
        this.currentFilter = filter;
        this.applyFilter();
    }

    applyFilter(): void {
        if (this.currentFilter === 'all') {
            this.filteredObjections = [...this.objections];
        } else if (this.currentFilter === 'pending') {
            this.filteredObjections = this.objections.filter(
                o => o.status === ObjectionStatus.PENDING || o.status === ObjectionStatus.UNDER_REVIEW
            );
        } else if (this.currentFilter === 'approved') {
            this.filteredObjections = this.objections.filter(
                o => o.status === ObjectionStatus.APPROVED
            );
        } else if (this.currentFilter === 'rejected') {
            this.filteredObjections = this.objections.filter(
                o => o.status === ObjectionStatus.REJECTED
            );
        }
    }

    get pageTitle(): string {
        return this.isAdmin() ? 'إدارة الاعتراضات' : 'مركز الاعتراضات';
    }

    get pageSubtitle(): string {
        return this.isAdmin()
            ? 'مراجعة الاعتراضات المقدمة واتخاذ القرارات'
            : 'تقديم ومتابعة الاعتراضات الرسمية للجنة المنظمة';
    }

    get pendingCount(): number {
        return this.objections.filter(o => o.status === ObjectionStatus.PENDING).length;
    }

    selectObjection(objection: Objection): void {
        this.selectedObjection = objection;
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
        return this.userRole === UserRole.ADMIN;
    }

    isCaptain(): boolean {
        return this.userRole === UserRole.CAPTAIN;
    }

    toggleForm(): void {
        this.showForm = true;
    }
}
