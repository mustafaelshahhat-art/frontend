import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { Component, OnInit, OnDestroy, AfterViewInit, inject, ChangeDetectorRef, computed, ViewChild, TemplateRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { AuthStore } from '../../../../core/stores/auth.store';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { User, UserRole } from '../../../../core/models/user.model';
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
    private cdr = inject(ChangeDetectorRef);
    private router = inject(Router);
    private readonly layoutOrchestrator = inject(LayoutOrchestratorService);

    user: User | null = null;
    userRole: UserRole = UserRole.PLAYER;
    profileForm!: FormGroup;
    passwordForm!: FormGroup;
    isLoading = false;
    isPasswordLoading = false;

    // Reactive signal for UI status
    isPending = computed(() => this.authStore.currentUser()?.status?.toLowerCase() === 'pending');

    // Active section for navigation
    activeSection: 'info' | 'password' = 'info';

    // Profile picture
    profilePicture: string | null = null;
    isUploadingPicture = false;

    // Edit mode state
    isEditing = false;
    pendingAvatar: string | null = null;
    avatarToDelete = false;
    originalAvatar: string | null = null;

    // Location dropdowns
    governorateOptions: SelectOption[] = [];
    cityOptions: SelectOption[] = [];
    districtOptions: SelectOption[] = [];
    isLocationsLoading = false;

    ngOnInit(): void {
        // Set layout page metadata
        this.layoutOrchestrator.setTitle(this.pageTitle);
        this.layoutOrchestrator.setSubtitle(this.pageSubtitle);

        this.user = this.authService.getCurrentUser();
        this.userRole = this.user?.role || UserRole.PLAYER;
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
        this.cdr.detectChanges();
    }

    ngOnDestroy(): void {
        this.layoutOrchestrator.reset();
    }

    refreshStatus(): void {
        this.isLoading = true;
        this.authService.refreshUserProfile().subscribe({
            next: (user) => {
                this.isLoading = false;
                if (user?.status?.toLowerCase() === 'active') {
                    this.uiFeedback.success('تم التفعيل', 'تم تفعيل حسابك بنجاح!');
                    this.loadUserProfile();
                } else {
                    this.uiFeedback.info('لا يزال قيد المراجعة', 'حسابك لا يزال قيد المراجعة من قبل الإدارة.');
                }
                this.cdr.detectChanges();
            },
            error: () => {
                this.isLoading = false;
                this.uiFeedback.error('خطأ', 'فشل في تحديث حالة الحساب');
                this.cdr.detectChanges();
            }
        });
    }

    loadUserProfile(): void {
        if (this.user?.id) {
            this.userService.getUserById(this.user.id).subscribe({
                next: (userData) => {
                    this.user = userData;
                    // Now populate the form with actual user data
                    this.populateForm();
                    // Ensure dependent location dropdowns are loaded for existing user values
                    this.loadLocations();
                    this.cdr.detectChanges();
                },
                error: (error) => {
                    console.error('Error loading user profile:', error);
                    // Even on error, try to populate with whatever data we have
                    if (this.user) {
                        this.populateForm();
                    }
                    // Best-effort locations load using whatever user data we have
                    this.loadLocations();
                    this.cdr.detectChanges();
                }
            });
        }
    }

    private loadLocations(): void {
        this.isLocationsLoading = true;
        this.locationService.getGovernorates().subscribe({
            next: (governorates) => {
                this.governorateOptions = governorates.map(g => ({
                    label: g,
                    value: g,
                    icon: 'location_on'
                }));
                this.isLocationsLoading = false;
                this.cdr.detectChanges();

                // If user has a governorate, load cities
                if (this.user?.governorate) {
                    this.loadCities(this.user.governorate);
                }
            },
            error: (error) => {
                console.error('Error loading governorates:', error);
                this.isLocationsLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    private loadCities(governorate: string): void {
        if (!governorate) return;

        this.isLocationsLoading = true;
        this.locationService.getCities(governorate).subscribe({
            next: (cities) => {
                this.cityOptions = cities.map(c => ({
                    label: c,
                    value: c,
                    icon: 'location_city'
                }));
                this.isLocationsLoading = false;
                this.cdr.detectChanges();

                // If user has a city, load districts
                if (this.user?.city) {
                    this.loadDistricts(this.user.city);
                }
            },
            error: (error) => {
                console.error('Error loading cities:', error);
                this.isLocationsLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    private loadDistricts(city: string): void {
        if (!city) return;

        this.isLocationsLoading = true;
        this.locationService.getDistricts(city).subscribe({
            next: (districts) => {
                this.districtOptions = districts.map(d => ({
                    label: d,
                    value: d,
                    icon: 'home'
                }));
                this.isLocationsLoading = false;
                this.cdr.detectChanges();
            },
            error: (error) => {
                console.error('Error loading districts:', error);
                this.isLocationsLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    // Location change handlers
    onGovernorateChange(governorate: string | SelectOption | null): void {
        let value = '';
        if (typeof governorate === 'string') {
            value = governorate;
        } else if (governorate && 'value' in governorate) {
            value = String(governorate.value);
        }

        this.profileForm.get('governorate')?.setValue(value);
        this.profileForm.get('city')?.setValue('');
        this.profileForm.get('neighborhood')?.setValue('');
        this.cityOptions = [];
        this.districtOptions = [];

        if (value) {
            this.loadCities(value);
        }
    }

    onCityChange(city: string | SelectOption | null): void {
        let value = '';
        if (typeof city === 'string') {
            value = city;
        } else if (city && 'value' in city) {
            value = String(city.value);
        }

        this.profileForm.get('city')?.setValue(value);
        this.profileForm.get('neighborhood')?.setValue('');
        this.districtOptions = [];

        if (value) {
            this.loadDistricts(value);
        }
    }

    onDistrictChange(district: string | SelectOption | null): void {
        let value = '';
        if (typeof district === 'string') {
            value = district;
        } else if (district && 'value' in district) {
            value = String(district.value);
        }
        this.profileForm.get('neighborhood')?.setValue(value);
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
        this.profilePicture = this.user?.avatar || null;

        // Disable all form fields initially (view mode)
        this.disableFormFields();

        // DON'T populate form here - wait for actual user data to load
        // The form will be populated in loadUserProfile() after data is received
    }

    private populateForm(): void {
        if (this.user && this.profileForm) {

            this.profileForm.patchValue({
                name: this.user.name || '',
                username: this.user.username || this.user.email?.split('@')[0] || '',
                email: this.user.email || '',
                phone: this.user.phone || '',
                nationalId: this.user.nationalId || '',
                governorate: this.user.governorate || '',
                city: this.user.city || '',
                neighborhood: this.user.neighborhood || '',
                bio: ''
            });

            // Set the profile picture from user avatar
            this.profilePicture = this.user.avatar || null;
            this.originalAvatar = this.user.avatar || null;

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

    get roleBadge(): string {
        return this.getRoleLabel(this.userRole);
    }

    getRoleLabel(role: UserRole | undefined): string {
        if (role === UserRole.PLAYER && this.user?.isTeamOwner) {
            return 'قائد فريق';
        }

        const roles: Partial<Record<UserRole, string>> = {
            [UserRole.ADMIN]: 'مدير النظام',
            [UserRole.REFEREE]: 'حكم معتمد',
            [UserRole.PLAYER]: 'لاعب'
        };
        return role ? (roles[role] || '') : '';
    }

    setActiveSection(section: unknown): void {
        this.activeSection = section as 'info' | 'password';
    }

    toggleEditMode(): void {
        if (this.isEditing) {
            this.saveProfile();
        } else {
            this.enterEditMode();
        }
    }

    enterEditMode(): void {
        this.isEditing = true;
        this.enableFormFields();
        // Store current avatar state for potential rollback
        this.pendingAvatar = this.profilePicture;
        this.avatarToDelete = false;

        // Ensure form starts as pristine (no changes)
        if (this.profileForm) {
            this.profileForm.markAsPristine();
        }

        this.cdr.detectChanges();
    }

    cancelEdit(): void {
        this.isEditing = false;
        this.disableFormFields();
        // Restore original avatar
        this.profilePicture = this.originalAvatar;
        this.pendingAvatar = null;
        this.avatarToDelete = false;
        // Reset form to original values
        this.populateForm();
        this.cdr.detectChanges();
    }

    get hasChanges(): boolean {
        const isFormDirty = this.profileForm?.dirty || false;
        const isAvatarChanged = (this.pendingAvatar !== this.originalAvatar && this.pendingAvatar !== null) || this.avatarToDelete;
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
                if (control) {
                    control.disable();
                }
            });
            // Re-enable username and nationalId which should always be disabled
            const usernameControl = this.profileForm.get('username');
            const nationalIdControl = this.profileForm.get('nationalId');
            if (usernameControl) usernameControl.disable();
            if (nationalIdControl) nationalIdControl.disable();
        }
    }

    saveProfile(): void {


        if (this.profileForm.valid && this.user) {
            this.isLoading = true;


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
            if (this.avatarToDelete) {
                updateData['removeAvatar'] = true;
            } else if (this.pendingAvatar && this.pendingAvatar !== this.originalAvatar) {
                updateData['avatar'] = this.pendingAvatar;
            }



            this.userService.updateUser(this.user.id, updateData).subscribe({
                next: (updated) => {

                    this.isLoading = false;
                    this.user = updated;
                    this.authService.updateCurrentUser(updated);
                    this.originalAvatar = updated.avatar || null;
                    this.profilePicture = updated.avatar || null;
                    this.isEditing = false;
                    this.disableFormFields();
                    this.avatarToDelete = false;
                    this.pendingAvatar = null;
                    this.uiFeedback.success('تم التحديث', 'تم تحديث بيانات الملف الشخصي بنجاح');
                    this.cdr.detectChanges();
                },
                error: (error) => {
                    console.error('Error updating user:', error);
                    this.isLoading = false;
                    const message = error.error?.message || 'حدث خطأ أثناء تحديث الملف الشخصي';
                    this.uiFeedback.error('خطأ', message);
                    this.cdr.detectChanges();
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
                this.uiFeedback.error('خطأ', 'كلمة المرور الجديدة غير متطابقة');
                return;
            }

            this.isPasswordLoading = true;
            this.authService.changePassword(currentPassword, newPassword).subscribe({
                next: () => {
                    this.isPasswordLoading = false;
                    this.uiFeedback.success('تم التغيير', 'تم تغيير كلمة المرور بنجاح');
                    this.passwordForm.reset();
                    this.cdr.detectChanges();
                },
                error: (error) => {
                    this.isPasswordLoading = false;
                    const message = error.error?.message || 'حدث خطأ أثناء تغيير كلمة المرور';
                    this.uiFeedback.error('خطأ', message);
                    this.cdr.detectChanges();
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
                this.uiFeedback.error('خطأ', 'يرجى اختيار ملف صورة صالح');
                return;
            }

            if (file.size > 2 * 1024 * 1024) {
                this.uiFeedback.error('خطأ', 'حجم الصورة يجب أن يكون أقل من 2 ميجابايت');
                return;
            }

            this.isUploadingPicture = true;
            this.cdr.detectChanges();

            this.userService.uploadAvatar(file).subscribe({
                next: (response) => {
                    this.profilePicture = response.avatarUrl;
                    this.pendingAvatar = response.avatarUrl;
                    this.avatarToDelete = false;
                    this.isUploadingPicture = false;
                    this.uiFeedback.success('تم التحديث', 'تم تحميل الصورة الشخصية بنجاح');
                    this.cdr.detectChanges();
                },
                error: (error) => {
                    this.isUploadingPicture = false;
                    const message = error.error?.message || 'حدث خطأ أثناء رفع الصورة';
                    this.uiFeedback.error('خطأ', message);
                    this.cdr.detectChanges();
                }
            });
        }
    }

    removePicture(): void {
        this.profilePicture = null;
        this.pendingAvatar = null;
        this.avatarToDelete = true;
        this.uiFeedback.success('تم التحديد', 'سيتم حذف الصورة عند حفظ التغييرات');
    }

    isReferee(): boolean {
        return this.userRole === UserRole.REFEREE;
    }

    isCaptain(): boolean {
        return !!this.user?.isTeamOwner;
    }

    get userInitial(): string {
        return this.user?.name?.charAt(0) || '?';
    }

    get displayId(): string {
        return this.user?.displayId || this.user?.id || '';
    }

    get saveButtonLabel(): string {
        return this.isEditing ? 'حفظ التغييرات' : 'تحديث الملف الشخصي';
    }

    get isFormDisabled(): boolean {
        return !this.isEditing;
    }
}
