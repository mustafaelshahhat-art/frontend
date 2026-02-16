import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { Component, OnInit, OnDestroy, AfterViewInit, inject, computed, signal, ViewChild, TemplateRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { AuthStore } from '../../../../core/stores/auth.store';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { User, UserRole, TeamRole } from '../../../../core/models/user.model';
import { FilterComponent } from '../../../../shared/components/filter/filter.component';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { UserService } from '../../../../core/services/user.service';
import { SmartImageComponent } from '../../../../shared/components/smart-image/smart-image.component';
import { FormControlComponent } from '../../../../shared/components/form-control/form-control.component';
import { SelectComponent, SelectOption } from '../../../../shared/components/select/select.component';
import { LocationService } from '../../../../core/services/location.service';
import { PendingStatusCardComponent } from '../../../../shared/components/pending-status-card/pending-status-card.component';
import { LayoutOrchestratorService } from '../../../../core/services/layout-orchestrator.service';
import { PermissionsService } from '../../../../core/services/permissions.service';
import { InlineLoadingComponent } from '../../../../shared/components/inline-loading/inline-loading.component';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [IconComponent,
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        CardComponent,
        ButtonComponent,
        FilterComponent,
        SmartImageComponent,
        FormControlComponent,
        SelectComponent,
        PendingStatusCardComponent,
        InlineLoadingComponent
    ],
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<unknown>;
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private authStore = inject(AuthStore);
    private userService = inject(UserService);
    private locationService = inject(LocationService);
    private uiFeedback = inject(UIFeedbackService);
    private router = inject(Router);
    private readonly layoutOrchestrator = inject(LayoutOrchestratorService);
    private readonly permissionsService = inject(PermissionsService);

    // PERF-FIX F8: All mutable state converted to signals — removes 15× manual cdr.detectChanges()
    user = signal<User | null>(null);
    userRole = signal<UserRole>(UserRole.PLAYER);
    profileForm!: FormGroup;
    passwordForm!: FormGroup;
    isLoading = signal(false);
    isPasswordLoading = signal(false);

    // Reactive signal for UI status
    isPending = computed(() => this.authStore.currentUser()?.status?.toLowerCase() === 'pending');

    // Active section for navigation
    activeSection = signal<'info' | 'password'>('info');

    // Profile picture
    profilePicture = signal<string | null>(null);
    isUploadingPicture = signal(false);

    // Edit mode state
    isEditing = signal(false);
    pendingAvatar = signal<string | null>(null);
    avatarToDelete = signal(false);
    originalAvatar = signal<string | null>(null);

    // Location dropdowns
    governorateOptions = signal<SelectOption[]>([]);
    cityOptions = signal<SelectOption[]>([]);
    districtOptions = signal<SelectOption[]>([]);
    isLocationsLoading = signal(false);

    ngOnInit(): void {
        // Set layout page metadata
        this.layoutOrchestrator.setTitle(this.pageTitle);
        this.layoutOrchestrator.setSubtitle(this.pageSubtitle);

        this.user.set(this.authService.getCurrentUser());
        this.userRole.set(this.user()?.role || UserRole.PLAYER);
        // Initialize forms immediately to avoid formGroup binding errors
        this.initForm();
        this.initPasswordForm();
        // Load fresh user data from backend
        this.loadUserProfile();
        // Load location data (governorates now; cities/districts based on selected values)
        this.loadLocations();
    }

    ngAfterViewInit(): void {
        // Defer to avoid ExpressionChangedAfterItHasBeenCheckedError
        queueMicrotask(() => {
            if (this.actionsTemplate) {
                this.layoutOrchestrator.setActions(this.actionsTemplate);
            }
        });
    }

    ngOnDestroy(): void {
        this.layoutOrchestrator.reset();
    }

    refreshStatus(): void {
        this.isLoading.set(true);
        this.authService.refreshUserProfile().subscribe({
            next: (user) => {
                this.isLoading.set(false);
                if (user?.status?.toLowerCase() === 'active') {
                    this.uiFeedback.success('تم التفعيل', 'تم تفعيل حسابك بنجاح!');
                    this.loadUserProfile();
                } else {
                    this.uiFeedback.info('لا يزال قيد المراجعة', 'حسابك لا يزال قيد المراجعة من قبل الإدارة.');
                }
            },
            error: () => {
                this.isLoading.set(false);
                this.uiFeedback.error('فشل التحديث', 'تعذّر التحقق من حالة الحساب. يرجى المحاولة مرة أخرى.');
            }
        });
    }

    loadUserProfile(): void {
        const currentUser = this.user();
        if (currentUser?.id) {
            this.userService.getUserById(currentUser.id).subscribe({
                next: (userData) => {
                    this.user.set(userData);
                    // Now populate the form with actual user data
                    this.populateForm();
                    // Ensure dependent location dropdowns are loaded for existing user values
                    this.loadLocations();
                },
                error: (error) => {
                    console.error('Error loading user profile:', error);
                    // Even on error, try to populate with whatever data we have
                    if (this.user()) {
                        this.populateForm();
                    }
                    // Best-effort locations load using whatever user data we have
                    this.loadLocations();
                }
            });
        }
    }

    private loadLocations(): void {
        this.isLocationsLoading.set(true);
        this.locationService.getGovernorates().subscribe({
            next: (governorates) => {
                this.governorateOptions.set(governorates.map(g => ({
                    label: g,
                    value: g,
                    icon: 'location_on'
                })));
                this.isLocationsLoading.set(false);

                // If user has a governorate, load cities
                const currentUser = this.user();
                if (currentUser?.governorate) {
                    this.loadCities(currentUser.governorate);
                }
            },
            error: (error) => {
                console.error('Error loading governorates:', error);
                this.isLocationsLoading.set(false);
            }
        });
    }

    private loadCities(governorate: string): void {
        if (!governorate) return;

        this.isLocationsLoading.set(true);
        this.locationService.getCities(governorate).subscribe({
            next: (cities) => {
                this.cityOptions.set(cities.map(c => ({
                    label: c,
                    value: c,
                    icon: 'location_city'
                })));
                this.isLocationsLoading.set(false);

                // If user has a city, load districts
                const currentUser = this.user();
                if (currentUser?.city) {
                    this.loadDistricts(currentUser.city);
                }
            },
            error: (error) => {
                console.error('Error loading cities:', error);
                this.isLocationsLoading.set(false);
            }
        });
    }

    private loadDistricts(city: string): void {
        if (!city) return;

        this.isLocationsLoading.set(true);
        this.locationService.getDistricts(city).subscribe({
            next: (districts) => {
                this.districtOptions.set(districts.map(d => ({
                    label: d,
                    value: d,
                    icon: 'home'
                })));
                this.isLocationsLoading.set(false);
            },
            error: (error) => {
                console.error('Error loading districts:', error);
                this.isLocationsLoading.set(false);
            }
        });
    }

    // Location change handlers
    onGovernorateChange(value: any): void {
        const governorate = typeof value === 'object' && value !== null ? value.value : value;

        this.profileForm.patchValue({
            city: '',
            neighborhood: ''
        });
        this.cityOptions.set([]);
        this.districtOptions.set([]);

        if (governorate) {
            this.loadCities(governorate);
        }
    }

    onCityChange(value: any): void {
        const city = typeof value === 'object' && value !== null ? value.value : value;

        this.profileForm.patchValue({
            neighborhood: ''
        });
        this.districtOptions.set([]);

        if (city) {
            this.loadDistricts(city);
        }
    }

    onDistrictChange(value: any): void {
        // Handled by formControlName but kept for future side effects if needed
    }

    private initForm(): void {
        // Initialize with empty/default values first
        this.profileForm = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(3)]],
            username: [{ value: '', disabled: true }],
            email: ['', [Validators.required, Validators.email]],
            phone: ['', [Validators.required, Validators.pattern(/^(01\d{9}|05\d{8})$/)]],
            nationalId: [{ value: '', disabled: true }],
            governorate: [''],
            city: [''],
            neighborhood: [''],
            bio: ['']
        });

        // Set the profile picture from user avatar
        this.profilePicture.set(this.user()?.avatar || null);

        // Disable all form fields initially (view mode)
        this.disableFormFields();

        // DON'T populate form here - wait for actual user data to load
        // The form will be populated in loadUserProfile() after data is received
    }

    private populateForm(): void {
        const currentUser = this.user();
        if (currentUser && this.profileForm) {

            this.profileForm.patchValue({
                name: currentUser.name || '',
                username: currentUser.username || currentUser.email?.split('@')[0] || '',
                email: currentUser.email || '',
                phone: currentUser.phone || '',
                nationalId: currentUser.nationalId || '',
                governorate: currentUser.governorate || '',
                city: currentUser.city || '',
                neighborhood: currentUser.neighborhood || '',
                bio: ''
            });

            // Set the profile picture from user avatar
            this.profilePicture.set(currentUser.avatar || null);
            this.originalAvatar.set(currentUser.avatar || null);

        }
    }

    private initPasswordForm(): void {
        this.passwordForm = this.fb.group({
            currentPassword: ['', [Validators.required, Validators.minLength(6)]],
            newPassword: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', [Validators.required]]
        });
    }

    readonly pageTitle = 'الملف الشخصي';
    readonly pageSubtitle = 'إدارة البيانات الشخصية وتحديث معلومات التواصل';

    roleBadge = computed(() => this.getRoleLabel(this.userRole()));

    getRoleLabel(role: UserRole | undefined): string {
        if (role === UserRole.PLAYER && this.permissionsService.isTeamCaptain()) {
            return 'قائد فريق';
        }

        const roles: Partial<Record<UserRole, string>> = {
            [UserRole.ADMIN]: 'مدير النظام',
            [UserRole.PLAYER]: 'لاعب'
        };
        return role ? (roles[role] || '') : '';
    }

    setActiveSection(section: unknown): void {
        this.activeSection.set(section as 'info' | 'password');
    }

    toggleEditMode(): void {
        if (this.isEditing()) {
            this.saveProfile();
        } else {
            this.enterEditMode();
        }
    }

    enterEditMode(): void {
        this.isEditing.set(true);
        this.enableFormFields();
        // Store current avatar state for potential rollback
        this.pendingAvatar.set(this.profilePicture());
        this.avatarToDelete.set(false);

        // Ensure form starts as pristine (no changes)
        if (this.profileForm) {
            this.profileForm.markAsPristine();
        }
    }

    cancelEdit(): void {
        this.isEditing.set(false);
        this.disableFormFields();
        // Restore original avatar
        this.profilePicture.set(this.originalAvatar());
        this.pendingAvatar.set(null);
        this.avatarToDelete.set(false);
        // Reset form to original values
        this.populateForm();
    }

    get hasChanges(): boolean {
        const isFormDirty = this.profileForm?.dirty || false;
        const isAvatarChanged = (this.pendingAvatar() !== this.originalAvatar() && this.pendingAvatar() !== null) || this.avatarToDelete();
        return isFormDirty || isAvatarChanged;
    }

    private enableFormFields(): void {
        if (this.profileForm) {
            Object.keys(this.profileForm.controls).forEach(key => {
                const control = this.profileForm.get(key);
                if (control && key !== 'username' && key !== 'nationalId') {
                    control.enable();
                }
            });
        }
    }

    private disableFormFields(): void {
        if (this.profileForm) {
            Object.keys(this.profileForm.controls).forEach(key => {
                const control = this.profileForm.get(key);
                control?.disable();
            });
        }
    }

    saveProfile(): void {


        if (this.profileForm.valid && this.user()) {
            this.isLoading.set(true);


            // Prepare update data
            const updateData: Record<string, unknown> = {};

            // Add form field changes
            const formValue = this.profileForm.getRawValue();
            Object.keys(formValue).forEach(key => {
                if (key !== 'username' && key !== 'nationalId') {
                    updateData[key] = formValue[key];
                }
            });



            // Handle avatar changes
            if (this.avatarToDelete()) {
                updateData['removeAvatar'] = true;
            } else if (this.pendingAvatar() && this.pendingAvatar() !== this.originalAvatar()) {
                updateData['avatar'] = this.pendingAvatar();
            }



            this.userService.updateUser(this.user()!.id, updateData).subscribe({
                next: (updated) => {

                    this.isLoading.set(false);
                    this.user.set(updated);
                    this.authService.updateCurrentUser(updated);
                    this.originalAvatar.set(updated.avatar || null);
                    this.profilePicture.set(updated.avatar || null);
                    this.isEditing.set(false);
                    this.disableFormFields();
                    this.avatarToDelete.set(false);
                    this.pendingAvatar.set(null);
                    this.uiFeedback.success('تم التحديث', 'تم تحديث بيانات الملف الشخصي بنجاح');
                },
                error: (error) => {
                    console.error('Error updating user:', error);
                    this.isLoading.set(false);
                    const message = error.error?.message || 'تعذّر تحديث الملف الشخصي. يرجى المحاولة مرة أخرى.';
                    this.uiFeedback.error('فشل التحديث', message);
                }
            });
        } else {
            // Form is invalid
            Object.keys(this.profileForm.controls).forEach(key => {
                const control = this.profileForm.get(key);
                control?.markAsTouched();
            });
            this.uiFeedback.error('بيانات غير صحيحة', 'يرجى التأكد من صحة جميع الحقول المطلوبة (الاسم، البريد الإلكتروني، رقم الهاتف)');
        }
    }

    updatePassword(): void {
        if (this.passwordForm.valid) {
            const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;

            if (newPassword !== confirmPassword) {
                this.uiFeedback.error('كلمة المرور غير متطابقة', 'كلمة المرور الجديدة وتأكيدها غير متطابقين. يرجى إعادة الإدخال.');
                return;
            }

            this.isPasswordLoading.set(true);
            this.authService.changePassword(currentPassword, newPassword).subscribe({
                next: () => {
                    this.isPasswordLoading.set(false);
                    this.uiFeedback.success('تم التغيير', 'تم تغيير كلمة المرور بنجاح');
                    this.passwordForm.reset();
                },
                error: (error) => {
                    this.isPasswordLoading.set(false);
                    const message = error.error?.message || 'تعذّر تغيير كلمة المرور. تأكد من كلمة المرور الحالية وحاول مرة أخرى.';
                    this.uiFeedback.error('فشل تغيير كلمة المرور', message);
                }
            });
        }
    }

    onFileInputChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            this.onFileSelected(Array.from(input.files));
            // Reset input to allow selecting the same file again
            input.value = '';
        }
    }

    onFileSelected(files: File[]): void {
        if (files && files[0]) {
            const file = files[0];

            if (!file.type.startsWith('image/')) {
                this.uiFeedback.error('صيغة غير مدعومة', 'يرجى اختيار ملف صورة صالح (JPG، PNG، أو GIF).');
                return;
            }

            if (file.size > 2 * 1024 * 1024) {
                this.uiFeedback.error('حجم كبير', 'حجم الصورة يجب أن يكون أقل من 2 ميجابايت. يرجى اختيار صورة أصغر.');
                return;
            }

            this.isUploadingPicture.set(true);

            this.userService.uploadAvatar(file).subscribe({
                next: (response) => {
                    this.profilePicture.set(response.avatarUrl);
                    this.pendingAvatar.set(response.avatarUrl);
                    this.avatarToDelete.set(false);
                    this.isUploadingPicture.set(false);
                    this.uiFeedback.success('تم التحديث', 'تم تحميل الصورة الشخصية بنجاح');
                },
                error: (error) => {
                    this.isUploadingPicture.set(false);
                    const message = error.error?.message || 'تعذّر رفع الصورة. يرجى المحاولة مرة أخرى.';
                    this.uiFeedback.error('فشل رفع الصورة', message);
                }
            });
        }
    }

    removePicture(): void {
        this.profilePicture.set(null);
        this.pendingAvatar.set(null);
        this.avatarToDelete.set(true);
        this.uiFeedback.success('تم التحديد', 'سيتم حذف الصورة عند حفظ التغييرات');
    }



    isCaptain(): boolean {
        return this.permissionsService.isTeamCaptain();
    }

    userInitial = computed(() => this.user()?.name?.charAt(0) || '?');

    displayId = computed(() => this.user()?.displayId || this.user()?.id || '');

    saveButtonLabel = computed(() => this.isEditing() ? 'حفظ التغييرات' : 'تحديث الملف الشخصي');

    isFormDisabled = computed(() => !this.isEditing());
}
