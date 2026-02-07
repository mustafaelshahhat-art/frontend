import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { SmartImageComponent } from '../../../shared/components/smart-image/smart-image.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { User, UserRole, UserStatus } from '../../../core/models/user.model';
import { UserService } from '../../../core/services/user.service';
import { UIFeedbackService } from '../../../shared/services/ui-feedback.service';
import { ChangeDetectorRef } from '@angular/core';

@Component({
    selector: 'app-user-detail',
    standalone: true,
    imports: [
        CommonModule,
        PageHeaderComponent,
        ButtonComponent,
        BadgeComponent,
        SmartImageComponent,
        EmptyStateComponent
    ],
    templateUrl: './user-detail.component.html',
    styleUrls: ['./user-detail.component.scss']
})
export class UserDetailComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly userService = inject(UserService);
    private readonly uiFeedback = inject(UIFeedbackService);
    private readonly cdr = inject(ChangeDetectorRef);

    user: any = null;
    isLoading = true;

    ngOnInit(): void {
        this.loadUser();
    }

    loadUser(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.isLoading = true;
            this.userService.getUserById(id).subscribe({
                next: (data) => {
                    this.user = data;
                    this.isLoading = false;
                    this.cdr.detectChanges();
                },
                error: (err) => {
                    this.isLoading = false;
                    this.uiFeedback.error('خطأ', 'فشل في تحميل بيانات المستخدم');
                    this.cdr.detectChanges();
                }
            });
        }
    }

    navigateBack(): void {
        this.router.navigate(['/admin/users']);
    }

    getBadgeType(status: string): 'success' | 'danger' | 'neutral' {
        switch (status) {
            case UserStatus.ACTIVE: return 'success';
            case UserStatus.SUSPENDED: return 'danger';
            default: return 'neutral';
        }
    }

    getStatusLabel(status: string): string {
        return status === UserStatus.ACTIVE ? 'نشط' : 'موقوف';
    }

    getRoleLabel(role: string): string {
        if (role === UserRole.PLAYER && this.user?.isTeamOwner) {
            return 'كابتن (صاحب فريق)';
        }

        switch (role) {
            case UserRole.ADMIN: return 'مسؤول';
            case UserRole.REFEREE: return 'حكم';
            default: return 'لاعب';
        }
    }

    getActivityIcon(type: string): string {
        switch (type?.toLowerCase()) {
            case 'login': return 'login';
            case 'match': return 'sports_soccer';
            case 'team': return 'groups';
            case 'system': return 'settings';
            case 'registration': return 'person_add';
            default: return 'info';
        }
    }

    getActivityBadgeClass(type: string): string {
        switch (type?.toLowerCase()) {
            case 'login': return 'badge-info';
            case 'match': return 'badge-success';
            case 'team': return 'badge-warning';
            case 'system': return 'badge-danger';
            case 'registration': return 'badge-success';
            default: return 'badge-info';
        }
    }

    toggleUserStatus(): void {
        const isActive = this.user.status === UserStatus.ACTIVE;
        const action = isActive ? 'إيقاف' : 'تفعيل';

        this.uiFeedback.confirm(
            `${action} المستخدم`,
            `هل أنت متأكد من ${action} حساب "${this.user.name}"؟`,
            action,
            isActive ? 'danger' : 'info'
        ).subscribe((confirmed: boolean) => {
            if (confirmed) {
                const request = isActive
                    ? this.userService.suspendUser(this.user.id)
                    : this.userService.activateUser(this.user.id);

                request.subscribe({
                    next: () => {
                        this.user.status = isActive ? UserStatus.SUSPENDED : UserStatus.ACTIVE;
                        this.uiFeedback.success('تم التحديث', `تم ${action} حساب المستخدم بنجاح`);
                        this.cdr.detectChanges();
                    },
                    error: () => {
                        this.uiFeedback.error('خطأ', `فشل في ${action} حساب المستخدم`);
                    }
                });
            }
        });
    }
}
