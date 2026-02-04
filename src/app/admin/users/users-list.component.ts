import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { User, UserRole, UserStatus } from '../../core/models/user.model';
import { FilterComponent } from '../../shared/components/filter/filter.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { InlineLoadingComponent } from '../../shared/components/inline-loading/inline-loading.component';
import { UIFeedbackService } from '../../shared/services/ui-feedback.service';

@Component({
    selector: 'app-users-list',
    standalone: true,
    imports: [
        CommonModule,
        FilterComponent,
        PageHeaderComponent,
        ButtonComponent,
        BadgeComponent,
        EmptyStateComponent,
        InlineLoadingComponent
    ],
    templateUrl: './users-list.component.html',
    styleUrls: ['./users-list.component.scss']
})
export class UsersListComponent implements OnInit {
    private readonly router = inject(Router);
    private readonly uiFeedback = inject(UIFeedbackService);

    users: User[] = [];
    isLoading = true;
    currentFilter = 'all';
    searchQuery = '';

    // User Type Tabs
    userType = 'captains';
    userTypeTabs = [
        { value: 'captains', label: 'إدارة الكباتن' },
        { value: 'referees', label: 'إدارة الحكام' }
    ];

    filters = [
        { value: 'all', label: 'الكل' },
        { value: UserStatus.ACTIVE, label: 'نشط' },
        { value: UserStatus.SUSPENDED, label: 'موقوف' }
    ];

    ngOnInit(): void {
        this.loadUsers();
    }

    loadUsers(): void {
        this.isLoading = true;
        // Simulate API call
        setTimeout(() => {
            this.users = [
                {
                    id: '1',
                    displayId: '1001',
                    name: 'محمد أحمد علي',
                    username: 'mo_ahmed',
                    email: 'mo@example.com',
                    role: UserRole.CAPTAIN,
                    status: UserStatus.ACTIVE,
                    createdAt: new Date('2024-03-01'),
                    teamName: 'الصقور'
                },
                {
                    id: '2',
                    displayId: '1002',
                    name: 'سالم العمري',
                    username: 'salem_amri',
                    email: 'salem@example.com',
                    role: UserRole.REFEREE,
                    status: UserStatus.ACTIVE,
                    createdAt: new Date('2024-03-05')
                },
                {
                    id: '3',
                    displayId: '1003',
                    name: 'فهد الجاسم',
                    username: 'fahad_j',
                    email: 'fahad@example.com',
                    role: UserRole.CAPTAIN,
                    status: UserStatus.SUSPENDED,
                    createdAt: new Date('2024-03-10'),
                    teamName: 'النجوم'
                }
            ];
            this.isLoading = false;
        }, 500);
    }

    get filteredUsers(): User[] {
        let result = this.users;

        // Filter by user type
        if (this.userType === 'captains') {
            result = result.filter(u => u.role === UserRole.CAPTAIN);
        } else if (this.userType === 'referees') {
            result = result.filter(u => u.role === UserRole.REFEREE);
        }

        // Filter by status
        if (this.currentFilter !== 'all') {
            result = result.filter(u => u.status === this.currentFilter);
        }

        return result;
    }

    setFilter(filter: string): void {
        this.currentFilter = filter;
    }

    getBadgeType(status: string): 'success' | 'danger' | 'neutral' {
        switch (status) {
            case UserStatus.ACTIVE: return 'success';
            case UserStatus.SUSPENDED: return 'danger';
            default: return 'neutral';
        }
    }

    getStatusLabel(status: string): string {
        switch (status) {
            case UserStatus.ACTIVE: return 'نشط';
            case UserStatus.SUSPENDED: return 'موقوف';
            default: return 'غير معروف';
        }
    }

    getRoleLabel(role: string): string {
        switch (role) {
            case UserRole.ADMIN: return 'مسؤول';
            case UserRole.CAPTAIN: return 'كابتن';
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
                user.status = UserStatus.SUSPENDED;
                this.uiFeedback.success('تم الإيقاف', 'تم إيقاف المستخدم بنجاح');
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
                this.users = this.users.filter(u => u.id !== user.id);
                this.uiFeedback.success('تم الحذف', 'تم حذف المستخدم بنجاح');
            }
        });
    }
}
