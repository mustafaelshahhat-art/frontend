import { Component, OnInit, inject, ChangeDetectorRef, signal, computed, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { User, UserRole, UserStatus } from '../../core/models/user.model';
import { FilterComponent } from '../../shared/components/filter/filter.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { TableComponent, TableColumn } from '../../shared/components/table/table.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { InlineLoadingComponent } from '../../shared/components/inline-loading/inline-loading.component';
import { SmartImageComponent } from '../../shared/components/smart-image/smart-image.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { FormControlComponent } from '../../shared/components/form-control/form-control.component';
import { UIFeedbackService } from '../../shared/services/ui-feedback.service';
import { UserService, AdminCountDto } from '../../core/services/user.service';

@Component({
    selector: 'app-users-list',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        ReactiveFormsModule,
        FilterComponent,
        PageHeaderComponent,
        ButtonComponent,
        BadgeComponent,
        EmptyStateComponent,
        InlineLoadingComponent,
        SmartImageComponent,
        TableComponent,
        ModalComponent,
        FormControlComponent
    ],
    templateUrl: './users-list.component.html',
    styleUrls: ['./users-list.component.scss']
})
export class UsersListComponent implements OnInit {
    private readonly router = inject(Router);
    private readonly uiFeedback = inject(UIFeedbackService);
    private readonly userService = inject(UserService);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly fb = inject(FormBuilder);

    users = signal<User[]>([]);
    isLoading = signal<boolean>(true);
    currentFilter = signal<string>('all');
    searchQuery = signal<string>('');

    // Admin count for safety checks
    adminCount = signal<AdminCountDto | null>(null);

    // User Type Tabs
    userType = signal<'admins' | 'referees' | 'players'>('admins');
    userTypeTabs = [
        { value: 'admins', label: 'المشرفين' },
        { value: 'referees', label: 'الحكام' },
        { value: 'players', label: 'اللاعبين' }
    ];

    // Table Columns
    columns: TableColumn[] = [];

    filters = [
        { value: 'all', label: 'الكل' },
        { value: UserStatus.ACTIVE, label: 'نشط' },
        { value: UserStatus.PENDING, label: 'معلق' },
        { value: UserStatus.SUSPENDED, label: 'موقوف' }
    ];

    // Modal State
    showAddAdminModal = signal<boolean>(false);
    isCreatingAdmin = signal<boolean>(false);

    // Admin Form
    adminForm: FormGroup = this.fb.group({
        name: ['', [Validators.required, Validators.minLength(3)]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        status: ['Active', Validators.required]
    });

    @ViewChild('indexInfo') indexInfo!: TemplateRef<any>;
    @ViewChild('userInfo') userInfo!: TemplateRef<any>;
    @ViewChild('dateInfo') dateInfo!: TemplateRef<any>;
    @ViewChild('teamInfo') teamInfo!: TemplateRef<any>;
    @ViewChild('statusInfo') statusInfo!: TemplateRef<any>;
    @ViewChild('actionsInfo') actionsInfo!: TemplateRef<any>;

    ngOnInit(): void {
        this.loadUsers();
        this.loadAdminCount();
    }

    ngAfterViewInit(): void {
        this.columns = [
            { key: 'index', label: '#', width: '60px', template: this.indexInfo },
            { key: 'user', label: 'المستخدم', template: this.userInfo },
            { key: 'createdAt', label: 'تاريخ التسجيل', sortable: true, template: this.dateInfo },
            { key: 'teamName', label: 'الفريق', template: this.teamInfo },
            { key: 'status', label: 'الحالة', sortable: true, template: this.statusInfo },
            { key: 'actions', label: 'إجراءات', width: '180px', template: this.actionsInfo }
        ];
        this.cdr.detectChanges();
    }

    loadUsers(): void {
        this.isLoading.set(true);
        this.userService.getUsers().subscribe({
            next: (data) => {
                this.users.set(data);
                this.isLoading.set(false);
            },
            error: () => {
                this.isLoading.set(false);
            }
        });
    }

    loadAdminCount(): void {
        this.userService.getAdminCount().subscribe({
            next: (data) => {
                this.adminCount.set(data);
            },
            error: () => {
                // Silent fail
            }
        });
    }

    filteredUsers = computed(() => {
        let result = this.users();
        const type = this.userType();
        const filter = this.currentFilter();

        // Filter by user type
        if (type === 'admins') {
            result = result.filter(u => u.role === UserRole.ADMIN);
        } else if (type === 'referees') {
            result = result.filter(u => u.role === UserRole.REFEREE);
        } else if (type === 'players') {
            result = result.filter(u => u.role === UserRole.PLAYER);
        }

        // Filter by status
        if (filter !== 'all') {
            result = result.filter(u => u.status === filter);
        }

        return result;
    });

    setFilter(filter: string): void {
        this.currentFilter.set(filter);
    }

    setUserType(type: any): void {
        this.userType.set(type);
    }

    getBadgeType(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
        switch (status) {
            case UserStatus.ACTIVE: return 'success';
            case UserStatus.PENDING: return 'warning';
            case UserStatus.SUSPENDED: return 'danger';
            default: return 'neutral';
        }
    }

    getStatusLabel(status: string): string {
        switch (status) {
            case UserStatus.ACTIVE: return 'نشط';
            case UserStatus.PENDING: return 'معلق';
            case UserStatus.SUSPENDED: return 'موقوف';
            default: return 'غير معروف';
        }
    }

    getRoleLabel(user: User): string {
        if (user.role === UserRole.PLAYER && user.isTeamOwner) {
            return 'قائد فريق';
        }

        switch (user.role) {
            case UserRole.ADMIN: return 'مسؤول';
            case UserRole.REFEREE: return 'حكم';
            default: return 'لاعب';
        }
    }

    viewUser(userId: string): void {
        this.router.navigate(['/admin/users', userId]);
    }

    warnUser(user: User): void {
        this.uiFeedback.confirm(
            'تحذير المستخدم',
            `هل تريد إرسال تحذير للمستخدم "${user.name}"؟`,
            'إرسال تحذير',
            'warning'
        ).subscribe((confirmed: boolean) => {
            if (confirmed) {
                // TODO: Implement backend warning endpoint
                this.uiFeedback.success('تم الإرسال', 'تم إرسال التحذير بنجاح');
            }
        });
    }

    /**
     * Checks if the user is the last admin (cannot be suspended/deleted)
     */
    isLastAdmin(user: User): boolean {
        if (user.role !== UserRole.ADMIN) return false;
        const count = this.adminCount();
        return count !== null && count.totalAdmins === 1;
    }

    suspendUser(user: User): void {
        // Safety check for last admin
        if (this.isLastAdmin(user)) {
            this.uiFeedback.error('غير مسموح', 'لا يمكن إيقاف آخر مشرف في النظام');
            return;
        }

        this.uiFeedback.confirm(
            'إيقاف المستخدم',
            `هل تريد إيقاف المستخدم "${user.name}"؟`,
            'إيقاف',
            'danger'
        ).subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.userService.suspendUser(user.id).subscribe({
                    next: () => {
                        this.users.update(prev => prev.map(u => u.id === user.id ? { ...u, status: UserStatus.SUSPENDED } : u));
                        this.uiFeedback.success('تم الإيقاف', 'تم إيقاف المستخدم بنجاح');
                        this.loadAdminCount(); // Refresh count
                    },
                    error: (err) => {
                        this.uiFeedback.error('خطأ', err.error?.message || 'فشل في إيقاف المستخدم');
                    }
                });
            }
        });
    }

    approveUser(user: User): void {
        this.uiFeedback.confirm(
            'تفعيل المستخدم',
            `هل تريد تفعيل حساب المستخدم "${user.name}"؟`,
            'تفعيل الآن',
            'info'
        ).subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.userService.activateUser(user.id).subscribe({
                    next: () => {
                        this.users.update(prev => prev.map(u => u.id === user.id ? { ...u, status: UserStatus.ACTIVE } : u));
                        this.uiFeedback.success('تم التفعيل', 'تم تفعيل حساب المستخدم بنجاح');
                        this.loadAdminCount(); // Refresh count
                    }
                });
            }
        });
    }

    deleteUser(user: User): void {
        // Safety check for last admin
        if (this.isLastAdmin(user)) {
            this.uiFeedback.error('غير مسموح', 'لا يمكن حذف آخر مشرف في النظام');
            return;
        }

        this.uiFeedback.confirm(
            'حذف المستخدم',
            `هل تريد حذف المستخدم "${user.name}" نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`,
            'حذف نهائي',
            'danger'
        ).subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.userService.deleteUser(user.id).subscribe({
                    next: () => {
                        this.users.update(prev => prev.filter(u => u.id !== user.id));
                        this.uiFeedback.success('تم الحذف', 'تم حذف المستخدم بنجاح');
                        this.loadAdminCount(); // Refresh count
                    },
                    error: (err) => {
                        this.uiFeedback.error('خطأ', err.error?.message || 'فشل في حذف المستخدم');
                    }
                });
            }
        });
    }

    // ==========================================
    // ADD ADMIN MODAL
    // ==========================================

    openAddAdminModal(): void {
        this.adminForm.reset({ status: 'Active' });
        this.showAddAdminModal.set(true);
    }

    closeAddAdminModal(): void {
        this.showAddAdminModal.set(false);
        this.adminForm.reset({ status: 'Active' });
    }

    submitAdminForm(): void {
        if (this.adminForm.invalid) {
            this.adminForm.markAllAsTouched();
            return;
        }

        this.isCreatingAdmin.set(true);
        const formValue = this.adminForm.value;

        this.userService.createAdmin({
            name: formValue.name,
            email: formValue.email,
            password: formValue.password,
            status: formValue.status
        }).subscribe({
            next: (newAdmin) => {
                this.isCreatingAdmin.set(false);
                this.closeAddAdminModal();
                this.users.update(prev => [newAdmin, ...prev]);
                this.loadAdminCount(); // Refresh count
                this.uiFeedback.success('تم الإنشاء', `تم إنشاء المشرف "${newAdmin.name}" بنجاح`);
            },
            error: (err) => {
                this.isCreatingAdmin.set(false);
                this.uiFeedback.error('خطأ', err.error?.message || 'فشل في إنشاء المشرف');
            }
        });
    }
}
