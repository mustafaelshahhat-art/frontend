import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { Component, OnInit, inject, ChangeDetectorRef, signal, computed, ViewChild, TemplateRef, AfterViewInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { LayoutOrchestratorService } from '../../../../core/services/layout-orchestrator.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ContextNavigationService } from '../../../../core/navigation/context-navigation.service';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { User, UserRole, UserStatus } from '../../../../core/models/user.model';
import { FilterComponent } from '../../../../shared/components/filter/filter.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { TableComponent, TableColumn } from '../../../../shared/components/table/table.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormControlComponent } from '../../../../shared/components/form-control/form-control.component';
import { UserStore } from '../../../../core/stores/user.store';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { createClientPagination, PaginationSource } from '../../../../shared/data-access/paginated-data-source';
import { UsersListFacade } from './users-list-facade.service';
import { getBadgeType, getStatusLabel } from './users-list.utils';

@Component({
    selector: 'app-users-list',
    standalone: true,
    imports: [IconComponent,
        CommonModule,
        ReactiveFormsModule,
        FilterComponent,
        ButtonComponent,
        BadgeComponent,
        TableComponent,
        ModalComponent,
        FormControlComponent,
        PaginationComponent
    ],
    templateUrl: './users-list.component.html',
    styleUrls: ['./users-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersListComponent implements OnInit, AfterViewInit, OnDestroy {
    private readonly router = inject(Router);
    private readonly facade = inject(UsersListFacade);
    private readonly userStore = inject(UserStore);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly fb = inject(FormBuilder);
    private readonly adminLayout = inject(LayoutOrchestratorService);
    private readonly navService = inject(ContextNavigationService);

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
    userType = signal<'admins' | 'players' | 'creators'>('admins');
    userTypeTabs = [
        { value: 'admins', label: 'المشرفين' },
        { value: 'creators', label: 'منشئي البطولات' },
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

    showAddCreatorModal = signal<boolean>(false);
    isCreatingCreator = signal<boolean>(false);

    filteredUsers = computed(() => {
        let result = this.users();
        const type = this.userType();
        const filter = this.currentFilter();

        // Filter by user type
        if (type === 'admins') {
            result = result.filter(u => u.role === UserRole.ADMIN);
        } else if (type === 'players') {
            result = result.filter(u => u.role === UserRole.PLAYER);
        } else if (type === 'creators') {
            result = result.filter(u => u.role === UserRole.TOURNAMENT_CREATOR);
        }

        // Filter by status
        if (filter !== 'all') {
            result = result.filter(u => u.status === filter);
        }

        return result;
    });

    // Pagination — slices filteredUsers client-side
    pager: PaginationSource<User> = createClientPagination(this.filteredUsers, { pageSize: 20 });

    // Admin Form
    adminForm: FormGroup = this.fb.group({
        name: ['', [Validators.required, Validators.minLength(3)]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        status: ['Active', Validators.required]
    });

    @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<unknown>;
    @ViewChild('filtersTemplate') filtersTemplate!: TemplateRef<unknown>;
    @ViewChild('indexInfo') indexInfo!: TemplateRef<unknown>;
    @ViewChild('userInfo') userInfo!: TemplateRef<unknown>;
    @ViewChild('dateInfo') dateInfo!: TemplateRef<unknown>;
    @ViewChild('teamInfo') teamInfo!: TemplateRef<unknown>;
    @ViewChild('statusInfo') statusInfo!: TemplateRef<unknown>;
    @ViewChild('actionsInfo') actionsInfo!: TemplateRef<unknown>;

    ngOnInit(): void {
        this.adminLayout.setTitle('إدارة المستخدمين');
        this.adminLayout.setSubtitle('عرض وإدارة حسابات المشرفين واللاعبين في النظام');

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

        // Defer to avoid ExpressionChangedAfterItHasCheckedError
        queueMicrotask(() => {
            this.adminLayout.setActions(this.actionsTemplate);
            this.adminLayout.setFilters(this.filtersTemplate);
            this.cdr.markForCheck();
        });

        this.cdr.detectChanges();
    }

    ngOnDestroy(): void {
        this.adminLayout.reset();
    }

    loadUsers(): void {
        this.facade.loadUsers();
    }

    setFilter(filter: unknown): void {
        this.currentFilter.set(filter as string);
        this.pager.loadPage(1);
    }

    setUserType(type: unknown): void {
        this.userType.set(type as 'admins' | 'players' | 'creators');
        this.pager.loadPage(1);
    }

    getBadgeType = getBadgeType;
    getStatusLabel = getStatusLabel;

    viewUser(userId: string): void {
        this.navService.navigateTo(['users', userId]);
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
        this.facade.suspendUser(user, this.isLastAdmin(user));
    }

    approveUser(user: User): void {
        this.facade.approveUser(user);
    }

    deleteUser(user: User): void {
        this.facade.deleteUser(user, this.isLastAdmin(user));
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
        if (this.adminForm.invalid) { this.adminForm.markAllAsTouched(); return; }
        this.facade.submitAdminForm(
            this.adminForm.value,
            (v) => this.isCreatingAdmin.set(v),
            () => this.closeAddAdminModal()
        );
    }

    // ==========================================
    // ADD CREATOR MODAL
    // ==========================================

    openAddCreatorModal(): void {
        this.adminForm.reset({ status: 'Active' });
        this.showAddCreatorModal.set(true);
    }

    closeAddCreatorModal(): void {
        this.showAddCreatorModal.set(false);
        this.adminForm.reset({ status: 'Active' });
    }

    submitCreatorForm(): void {
        if (this.adminForm.invalid) { this.adminForm.markAllAsTouched(); return; }
        this.facade.submitCreatorForm(
            this.adminForm.value,
            (v) => this.isCreatingCreator.set(v),
            () => this.closeAddCreatorModal()
        );
    }
}

