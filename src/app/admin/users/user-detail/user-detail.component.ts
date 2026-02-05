import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { User, UserRole, UserStatus } from '../../../core/models/user.model';
import { UIFeedbackService } from '../../../shared/services/ui-feedback.service';

@Component({
    selector: 'app-user-detail',
    standalone: true,
    imports: [
        CommonModule,
        PageHeaderComponent,
        ButtonComponent,
        BadgeComponent
    ],
    templateUrl: './user-detail.component.html',
    styleUrls: ['./user-detail.component.scss']
})
export class UserDetailComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly uiFeedback = inject(UIFeedbackService);

    user: any = {
        id: '1',
        displayId: 'PLR-6001',
        name: 'سالم عبدالله',
        username: 'salem_88',
        email: 'salem@example.com',
        role: UserRole.CAPTAIN,
        status: UserStatus.ACTIVE,
        createdAt: new Date('2024-03-01'),
        teamName: 'نادي الصقور',
        phone: '+966 50 123 4567',
        age: 28,
        nationalId: '1029384756',
        governorate: 'الرياض',
        city: 'الرياض',
        neighborhood: 'العليا',
        idFrontUrl: 'https://images.unsplash.com/photo-1613243555988-441166d4d6fd?q=80&w=400&auto=format&fit=crop',
        idBackUrl: 'https://images.unsplash.com/photo-1589156229687-496a31ad1d1f?q=80&w=400&auto=format&fit=crop'
    };

    activities = [
        { icon: 'login', message: 'تسجيل دخول إلى النظام', time: 'منذ ٤٥ دقيقة' },
        { icon: 'edit', message: 'تحديث بيانات الفريق', time: 'منذ ساعتين' },
        { icon: 'sports_soccer', message: 'تسجيل نتيجة مباراة #14', time: 'أمس' }
    ];

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
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
        switch (role) {
            case UserRole.ADMIN: return 'مسؤول';
            case UserRole.CAPTAIN: return 'كابتن';
            case UserRole.REFEREE: return 'حكم';
            default: return 'لاعب';
        }
    }

    toggleUserStatus(): void {
        const newStatus = this.user.status === UserStatus.ACTIVE ? UserStatus.SUSPENDED : UserStatus.ACTIVE;
        const action = newStatus === UserStatus.ACTIVE ? 'تفعيل' : 'إيقاف';

        this.uiFeedback.confirm(
            `${action} المستخدم`,
            `هل أنت متأكد من ${action} حساب "${this.user.name}"؟`,
            action,
            newStatus === UserStatus.ACTIVE ? 'info' : 'danger'
        ).subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.user.status = newStatus;
                this.uiFeedback.success('تم التحديث', `تم ${action} حساب المستخدم بنجاح`);
            }
        });
    }
}
