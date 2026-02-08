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
import { SmartImageComponent } from '../../shared/components/smart-image/smart-image.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { FormControlComponent } from '../../shared/components/form-control/form-control.component';
import { UIFeedbackService } from '../../shared/services/ui-feedback.service';
import { UserService } from '../../core/services/user.service';
import { UserStore } from '../../core/stores/user.store';

@Component({
    selector: 'app-users-list',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FilterComponent,
        PageHeaderComponent,
        ButtonComponent,
        BadgeComponent,
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
    private readonly userStore = inject(UserStore);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly fb = inject(FormBuilder);

    // map store signals
    users = this.userStore.users;
    isLoading = this.userStore.isLoading;

    currentFilter = signal<string>('all');
    searchQuery = signal<string>('');

    // Admin count for safety checks
    adminCount = computed(() => {
        const totalAdmins = this.users().filter(user =>
            user.role === UserRole.ADMIN && user.status !== UserStatus.SUSPENDED
        ).length;

        return { totalAdmins, isLastAdmin: totalAdmins === 1 };
    });

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
        // Initial load only
        this.loadUsers();
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
        this.userStore.setLoading(true);
        this.userService.getUsers().subscribe({
            next: (data) => {
                this.userStore.setUsers(data);
            },
            error: (err) => {
                this.userStore.setError(err.message);
                this.userStore.setLoading(false);
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

    /**
     * Checks if the user is the last admin (cannot be suspended/deleted)
     */
    isLastAdmin(user: User): boolean {
        if (user.role !== UserRole.ADMIN) return false;
        const count = this.adminCount();
        return count.totalAdmins === 1;
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
                        // Optimistic update handled by Store if backend emits event
                        // But we can also set it locally to be snappy if event is slow
                        // However, Rule #3 says Store is single source of truth.
                        // We rely on backend event which we added: SendUserUpdatedAsync
                        this.uiFeedback.success('تم الإيقاف', 'تم إيقاف المستخدم بنجاح');
                    },
                    error: (err) => {
                        this.uiFeedback.error('خطأ', err.error?.message || 'فشل في إيقاف المستخدم');
                    }
                });
            }
        });
    }

    approveUser(user: User): void {
        const isSuspended = user.status === UserStatus.SUSPENDED;
        const title = isSuspended ? 'تفعيل الحساب' : 'تفعيل المستخدم';
        const message = isSuspended
            ? `هل تريد إعادة تفعيل حساب المستخدم "${user.name}"؟`
            : `هل تريد تفعيل حساب المستخدم "${user.name}" والموافقة على انضمامه؟`;
        const actionLabel = isSuspended ? 'تفعيل الآن' : 'موافقة وتفعيل';

        this.uiFeedback.confirm(
            title,
            message,
            actionLabel,
            'info'
        ).subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.userService.activateUser(user.id).subscribe({
                    next: () => {
                        this.uiFeedback.success('تم التفعيل', 'تم تفعيل حساب المستخدم بنجاح');
                    },
                    error: (err) => {
                        this.uiFeedback.error('خطأ', err.error?.message || 'فشل في تفعيل المستخدم');
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
                        this.uiFeedback.success('تم الحذف', 'تم حذف المستخدم بنجاح');
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
                // Store update happens via SignalR 'UserCreated' event automatically
                this.uiFeedback.success('تم الإنشاء', `تم إنشاء المشرف "${newAdmin.name}" بنجاح`);
            },
            error: (err) => {
                this.isCreatingAdmin.set(false);
                this.uiFeedback.error('خطأ', err.error?.message || 'فشل في إنشاء المشرف');
            }
        });
    }
}


