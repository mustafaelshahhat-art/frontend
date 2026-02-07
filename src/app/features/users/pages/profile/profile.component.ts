import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { User, UserRole } from '../../../../core/models/user.model';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { FilterComponent } from '../../../../shared/components/filter/filter.component';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { UserService } from '../../../../core/services/user.service';
import { SmartImageComponent } from '../../../../shared/components/smart-image/smart-image.component';
import { FileUploadComponent } from '../../../../shared/components/file-upload/file-upload.component';
import { FormControlComponent } from '../../../../shared/components/form-control/form-control.component';
import { SelectComponent, SelectOption } from '../../../../shared/components/select/select.component';
import { LocationService } from '../../../../core/services/location.service';
import { PendingStatusCardComponent } from '../../../../shared/components/pending-status-card/pending-status-card.component';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        PageHeaderComponent,
        CardComponent,
        ButtonComponent,
        BadgeComponent,
        FilterComponent,
        SmartImageComponent,
        FileUploadComponent,
        FormControlComponent,
        SelectComponent,
        PendingStatusCardComponent
    ],
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private userService = inject(UserService);
    private locationService = inject(LocationService);
    private uiFeedback = inject(UIFeedbackService);
    private cdr = inject(ChangeDetectorRef);

    user: User | null = null;
    userRole: UserRole = UserRole.PLAYER;
    profileForm!: FormGroup;
    passwordForm!: FormGroup;
    isLoading = false;
    isPasswordLoading = false;
    isPending = false;

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
        this.user = this.authService.getCurrentUser();
        this.userRole = this.user?.role || UserRole.PLAYER;
        this.isPending = this.user?.status?.toLowerCase() === 'pending';
        // Initialize forms immediately to avoid formGroup binding errors
        this.initForm();
        this.initPasswordForm();
        // Load fresh user data from backend
        this.loadUserProfile();
        // Load location data (governorates now; cities/districts based on selected values)
        this.loadLocations();

        // Log for debugging
        console.log('Profile component initialized with forms:', {
            profileForm: !!this.profileForm,
            passwordForm: !!this.passwordForm,
            user: this.user
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
    onGovernorateChange(governorate: any): void {
        const value = typeof governorate === 'string' ? governorate : governorate?.value || '';
        this.profileForm.get('governorate')?.setValue(value);
        this.profileForm.get('city')?.setValue('');
        this.profileForm.get('neighborhood')?.setValue('');
        this.cityOptions = [];
        this.districtOptions = [];

        if (value) {
            this.loadCities(value);
        }
    }

    onCityChange(city: any): void {
        const value = typeof city === 'string' ? city : city?.value || '';
        this.profileForm.get('city')?.setValue(value);
        this.profileForm.get('neighborhood')?.setValue('');
        this.districtOptions = [];

        if (value) {
            this.loadDistricts(value);
        }
    }

    onDistrictChange(district: any): void {
        const value = typeof district === 'string' ? district : district?.value || '';
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
            console.log('Populating form with user data:', this.user);
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
            console.log('Form populated, profile picture:', this.profilePicture);
        }
    }

    private initPasswordForm(): void {
        this.passwordForm = this.fb.group({
            currentPassword: ['', [Validators.required, Validators.minLength(6)]],
            newPassword: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', [Validators.required]]
        });
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

    setActiveSection(section: 'info' | 'password'): void {
        this.activeSection = section;
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
        console.log('Save profile called');
        console.log('Form valid:', this.profileForm.valid);
        console.log('User:', this.user);
        console.log('Form value:', this.profileForm.getRawValue());

        if (this.profileForm.valid && this.user) {
            this.isLoading = true;
            console.log('Starting save process...');

            // Prepare update data
            const updateData: any = {};

            // Add form field changes
            const formValue = this.profileForm.getRawValue();
            Object.keys(formValue).forEach(key => {
                if (key !== 'username' && key !== 'nationalId') {
                    updateData[key] = formValue[key];
                }
            });

            console.log('Update data:', updateData);

            // Handle avatar changes
            if (this.avatarToDelete) {
                updateData.removeAvatar = true;
            } else if (this.pendingAvatar && this.pendingAvatar !== this.originalAvatar) {
                updateData.avatar = this.pendingAvatar;
            }

            console.log('avatarToDelete:', this.avatarToDelete);
            console.log('Final update data with avatar:', updateData);

            this.userService.updateUser(this.user.id, updateData).subscribe({
                next: (updated) => {
                    console.log('User updated successfully:', updated);
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
            console.log('Form is invalid or user is null');
            console.log('Form errors:', this.profileForm.errors);
            Object.keys(this.profileForm.controls).forEach(key => {
                const control = this.profileForm.get(key);
                if (control && control.invalid) {
                    console.log(`${key} errors:`, control.errors);
                }
            });
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
