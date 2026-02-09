import { Component, OnInit, inject, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { SmartImageComponent } from '../../../shared/components/smart-image/smart-image.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { User, UserRole, UserStatus } from '../../../core/models/user.model';
import { UserService } from '../../../core/services/user.service';
import { UserStore } from '../../../core/stores/user.store';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { InlineLoadingComponent } from '../../../shared/components/inline-loading/inline-loading.component';
import { AdminLayoutService } from '../../../core/services/admin-layout.service';
import { UIFeedbackService } from '../../../shared/services/ui-feedback.service';
import { ChangeDetectorRef } from '@angular/core';

@Component({
    selector: 'app-user-detail',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ButtonComponent,
        BadgeComponent,
        SmartImageComponent,
        EmptyStateComponent,
        StatCardComponent,
        InlineLoadingComponent
    ],
    templateUrl: './user-detail.component.html',
    styleUrls: ['./user-detail.component.scss']
})
export class UserDetailComponent implements OnInit, OnDestroy {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly userService = inject(UserService);
    private readonly userStore = inject(UserStore);
    private readonly adminLayout = inject(AdminLayoutService);
    private readonly uiFeedback = inject(UIFeedbackService);
    private readonly cdr = inject(ChangeDetectorRef);

    private readonly userId = signal<string | null>(null);
    private readonly userSignal = computed(() => {
        const id = this.userId();
        return id ? this.userStore.getUserById(id) || null : null;
    });

    isLastAdmin = computed(() => {
        const u = this.user;
        if (!u || u.role !== UserRole.ADMIN || u.status === UserStatus.SUSPENDED || u.status === UserStatus.DISABLED) return false;

        const activeAdmins = this.userStore.users().filter(user =>
            user.role === UserRole.ADMIN && user.status !== UserStatus.SUSPENDED && user.status !== UserStatus.DISABLED
        );

        return activeAdmins.length === 1 && activeAdmins[0].id === u.id;
    });

    isLoading = true;

    get user(): User | null {
        return this.userSignal();
    }

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.userId.set(id);
            this.loadUser(id);
        }
    }

    private updateLayout(): void {
        const u = this.user;
        if (!u) return;

        this.adminLayout.setTitle(`تفاصيل المستخدم: ${u.name}`);
        this.adminLayout.setSubtitle(u.email);
        this.adminLayout.setBackAction(() => this.navigateBack());
    }

    ngOnDestroy(): void {
        this.adminLayout.reset();
    }

    loadUser(id: string): void {
        this.isLoading = true;
        this.userService.getUserById(id).subscribe({
            next: (data) => {
                this.userStore.upsertUser(data);
                this.updateLayout();
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.isLoading = false;
                this.uiFeedback.error('خطأ', 'فشل في تحميل بيانات المستخدم');
                this.cdr.detectChanges();
            }
        });
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
            return 'لاعب (قائد فريق)';
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
        if (!this.user || (this.user.status === UserStatus.ACTIVE && this.isLastAdmin())) {
            if (this.isLastAdmin()) {
                this.uiFeedback.error('غير مسموح', 'لا يمكن إيقاف آخر مشرف نشط في النظام');
            }
            return;
        }

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
                    ? this.userService.suspendUser(this.user!.id)
                    : this.userService.activateUser(this.user!.id);

                request.subscribe({
                    next: () => {
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
