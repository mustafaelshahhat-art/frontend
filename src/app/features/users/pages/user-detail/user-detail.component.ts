import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { Component, OnInit, inject, signal, computed, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ContextNavigationService } from '../../../../core/navigation/context-navigation.service';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { User, UserRole, UserStatus, TeamRole } from '../../../../core/models/user.model';
import { UserService } from '../../../../core/services/user.service';
import { UserStore } from '../../../../core/stores/user.store';
import { StatCardComponent } from '../../../../shared/components/stat-card/stat-card.component';
import { InlineLoadingComponent } from '../../../../shared/components/inline-loading/inline-loading.component';
import { LayoutOrchestratorService } from '../../../../core/services/layout-orchestrator.service';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { SmartImageComponent } from '../../../../shared/components/smart-image/smart-image.component';
import { firstValueFrom } from 'rxjs';

@Component({
    selector: 'app-user-detail',
    standalone: true,
    imports: [IconComponent,
        CommonModule,
        ReactiveFormsModule,
        ButtonComponent,
        BadgeComponent,
        EmptyStateComponent,
        StatCardComponent,
        InlineLoadingComponent,
        SmartImageComponent
    ],
    templateUrl: './user-detail.component.html',
    styleUrls: ['./user-detail.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserDetailComponent implements OnInit, OnDestroy {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly userService = inject(UserService);
    private readonly userStore = inject(UserStore);
    private readonly adminLayout = inject(LayoutOrchestratorService);
    private readonly uiFeedback = inject(UIFeedbackService);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly navService = inject(ContextNavigationService);

    private readonly userId = signal<string | null>(null);
    private readonly userSignal = computed(() => {
        const id = this.userId();
        return id ? this.userStore.getUserById(id) || null : null;
    });

    isLastAdmin = computed(() => {
        const u = this.user;
        if (!u || u.role !== UserRole.ADMIN || u.status === UserStatus.SUSPENDED) return false;

        const activeAdmins = this.userStore.users().filter(user =>
            user.role === UserRole.ADMIN && user.status !== UserStatus.SUSPENDED
        );

        return activeAdmins.length === 1 && activeAdmins[0].id === u.id;
    });

    selectedImage = signal<string | null>(null);

    openImage(url: string | undefined | null): void {
        if (url) {
            this.selectedImage.set(url);
        }
    }

    closeImage(): void {
        this.selectedImage.set(null);
    }

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

    async loadUser(id: string): Promise<void> {
        this.isLoading = true;
        try {
            const data = await firstValueFrom(this.userService.getUserById(id));
            this.userStore.upsertUser(data);
            this.updateLayout();
        } catch {
            this.uiFeedback.error('فشل التحميل', 'تعذّر تحميل بيانات المستخدم. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
        }
    }

    navigateBack(): void {
        this.navService.navigateTo('users');
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
        if (role === UserRole.PLAYER && this.user?.teamRole === TeamRole.CAPTAIN) {
            return 'لاعب (قائد فريق)';
        }

        switch (role) {
            case UserRole.ADMIN: return 'مسؤول';
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

    async toggleUserStatus(): Promise<void> {
        if (!this.user || (this.user.status === UserStatus.ACTIVE && this.isLastAdmin())) {
            if (this.isLastAdmin()) {
                this.uiFeedback.error('غير مسموح', 'لا يمكن إيقاف آخر مشرف نشط في النظام');
            }
            return;
        }

        const isActive = this.user.status === UserStatus.ACTIVE;
        const action = isActive ? 'إيقاف' : 'تفعيل';

        const confirmed = await firstValueFrom(this.uiFeedback.confirm(
            `${action} المستخدم`,
            `هل أنت متأكد من ${action} حساب "${this.user.name}"؟`,
            action,
            isActive ? 'danger' : 'info'
        ));
        if (!confirmed) return;

        try {
            await firstValueFrom(
                isActive
                    ? this.userService.suspendUser(this.user!.id)
                    : this.userService.activateUser(this.user!.id)
            );
            this.uiFeedback.success('تم التحديث', `تم ${action} حساب المستخدم بنجاح`);
            this.cdr.detectChanges();
        } catch {
            this.uiFeedback.error('فشل التحديث', `تعذّر ${action} حساب المستخدم. يرجى المحاولة مرة أخرى.`);
        }
    }
}
