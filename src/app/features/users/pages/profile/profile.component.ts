import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { User, UserRole } from '../../../../core/models/user.model';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { FilterComponent } from '../../../../shared/components/filter/filter.component';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';


@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        PageHeaderComponent,
        CardComponent,
        ButtonComponent,
        BadgeComponent,

        FilterComponent
    ],
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private uiFeedback = inject(UIFeedbackService);
    private cdr = inject(ChangeDetectorRef);

    user: User | null = null;
    userRole: UserRole = UserRole.CAPTAIN;
    profileForm!: FormGroup;
    passwordForm!: FormGroup;
    isLoading = false;
    isPasswordLoading = false;

    // Active section for navigation
    activeSection: 'info' | 'password' = 'info';

    // Profile picture
    profilePicture: string | null = null;
    isUploadingPicture = false;

    ngOnInit(): void {
        this.user = this.authService.getCurrentUser();
        this.userRole = this.user?.role || UserRole.CAPTAIN;
        this.initForm();
        this.initPasswordForm();
    }

    private initForm(): void {
        this.profileForm = this.fb.group({
            name: [this.user?.name || '', [Validators.required, Validators.minLength(3)]],
            username: [{ value: this.user?.username || '', disabled: true }],
            email: [this.user?.email || '', [Validators.required, Validators.email]],
            phone: [this.user?.phone || '', [Validators.required, Validators.pattern(/^05\d{8}$/)]],
            nationalId: [{ value: this.user?.nationalId || '', disabled: true }],
            governorate: [this.user?.governorate || ''],
            city: [this.user?.city || ''],
            neighborhood: [this.user?.neighborhood || ''],
            bio: [this.getBio()]
        });
    }

    private initPasswordForm(): void {
        this.passwordForm = this.fb.group({
            currentPassword: ['', [Validators.required, Validators.minLength(6)]],
            newPassword: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', [Validators.required]]
        });
    }

    private getBio(): string {
        if (this.isReferee()) {
            return '';
        }
        return '';
    }

    get pageTitle(): string {
        return 'الملف الشخصي';
    }

    get pageSubtitle(): string {
        return 'إدارة البيانات الشخصية وتحديث معلومات التواصل';
    }

    get roleBadge(): string {
        return this.getRoleLabel(this.userRole);
    }

    getRoleLabel(role: UserRole | undefined): string {
        const roles: Record<UserRole, string> = {
            [UserRole.ADMIN]: 'مدير النظام',
            [UserRole.CAPTAIN]: 'قائد فريق',
            [UserRole.REFEREE]: 'حكم معتمد',
            [UserRole.PLAYER]: 'لاعب'
        };
        return role ? roles[role] : '';
    }

    setActiveSection(section: 'info' | 'password'): void {
        this.activeSection = section;
    }

    updateProfile(): void {
        if (this.profileForm.valid) {
            this.isLoading = true;
            this.cdr.detectChanges();

            setTimeout(() => {
                this.isLoading = false;
                this.uiFeedback.success('تم التحديث', 'تم تحديث بيانات الملف الشخصي بنجاح');
                this.cdr.detectChanges();
            }, 1000);
        }
    }

    updatePassword(): void {
        if (this.passwordForm.valid) {
            const { newPassword, confirmPassword } = this.passwordForm.value;

            if (newPassword !== confirmPassword) {
                this.uiFeedback.error('خطأ', 'كلمة المرور الجديدة غير متطابقة');
                return;
            }

            this.isPasswordLoading = true;
            this.cdr.detectChanges();

            setTimeout(() => {
                this.isPasswordLoading = false;
                this.uiFeedback.success('تم التغيير', 'تم تغيير كلمة المرور بنجاح');
                this.passwordForm.reset();
                this.cdr.detectChanges();
            }, 1000);
        }
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            const file = input.files[0];

            // Validate file type
            if (!file.type.startsWith('image/')) {
                this.uiFeedback.error('خطأ', 'يرجى اختيار ملف صورة صالح');
                return;
            }

            // Validate file size (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                this.uiFeedback.error('خطأ', 'حجم الصورة يجب أن يكون أقل من 2 ميجابايت');
                return;
            }

            this.isUploadingPicture = true;
            this.cdr.detectChanges();

            // Read file and convert to base64
            const reader = new FileReader();
            reader.onload = () => {
                setTimeout(() => {
                    this.profilePicture = reader.result as string;
                    this.isUploadingPicture = false;
                    this.uiFeedback.success('تم التحديث', 'تم تحديث الصورة الشخصية بنجاح');
                    this.cdr.detectChanges();
                }, 1000);
            };
            reader.readAsDataURL(file);
        }
    }

    removePicture(): void {
        this.profilePicture = null;
        this.uiFeedback.success('تم الإزالة', 'تم إزالة الصورة الشخصية');
    }

    isReferee(): boolean {
        return this.userRole === UserRole.REFEREE;
    }

    isCaptain(): boolean {
        return this.userRole === UserRole.CAPTAIN;
    }

    get userInitial(): string {
        return this.user?.name?.charAt(0) || '?';
    }

    get displayId(): string {
        return this.user?.displayId || this.user?.id || '';
    }
}
