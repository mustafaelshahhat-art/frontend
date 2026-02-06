import { Component, OnInit, inject, ChangeDetectorRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { User, UserRole, UserStatus } from '../../core/models/user.model';
import { FilterComponent } from '../../shared/components/filter/filter.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { InlineLoadingComponent } from '../../shared/components/inline-loading/inline-loading.component';
import { SmartImageComponent } from '../../shared/components/smart-image/smart-image.component';
import { UIFeedbackService } from '../../shared/services/ui-feedback.service';
import { UserService } from '../../core/services/user.service';

@Component({
    selector: 'app-users-list',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        FilterComponent,
        PageHeaderComponent,
        ButtonComponent,
        BadgeComponent,
        EmptyStateComponent,
        InlineLoadingComponent,
        SmartImageComponent
    ],
    templateUrl: './users-list.component.html',
    styleUrls: ['./users-list.component.scss']
})
export class UsersListComponent implements OnInit {
    private readonly router = inject(Router);
    private readonly uiFeedback = inject(UIFeedbackService);
    private readonly userService = inject(UserService);
    private readonly cdr = inject(ChangeDetectorRef);

    users = signal<User[]>([]);
    isLoading = signal<boolean>(true);
    currentFilter = signal<string>('all');
    searchQuery = signal<string>('');

    // User Type Tabs
    userType = signal<'admins' | 'referees' | 'players'>('admins');
    userTypeTabs = [
        { value: 'admins', label: 'المشرفين' },
        { value: 'referees', label: 'الحكام' },
        { value: 'players', label: 'اللاعبين' }
    ];

    filters = [
        { value: 'all', label: 'الكل' },
        { value: UserStatus.ACTIVE, label: 'نشط' },
        { value: UserStatus.PENDING, label: 'معلق' },
        { value: UserStatus.SUSPENDED, label: 'موقوف' }
    ];

    ngOnInit(): void {
        this.loadUsers();
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

    suspendUser(user: User): void {
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
                    }
                });
            }
        });
    }

    deleteUser(user: User): void {
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
                    }
                });
            }
        });
    }
}

