import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { Component, OnInit, OnDestroy, AfterViewInit, inject, computed, signal, ViewChild, TemplateRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { AuthStore } from '../../../../core/stores/auth.store';
import { User, UserRole } from '../../../../core/models/user.model';
import { FilterComponent } from '../../../../shared/components/filter/filter.component';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { FormControlComponent } from '../../../../shared/components/form-control/form-control.component';
import { SelectComponent } from '../../../../shared/components/select/select.component';
import { PendingStatusCardComponent } from '../../../../shared/components/pending-status-card/pending-status-card.component';
import { LayoutOrchestratorService } from '../../../../core/services/layout-orchestrator.service';
import { PermissionsService } from '../../../../core/services/permissions.service';
import { ProfileFacadeService } from './profile-facade.service';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [
        IconComponent, CommonModule, FormsModule, ReactiveFormsModule,
        CardComponent, ButtonComponent, FilterComponent,
        FormControlComponent, SelectComponent, PendingStatusCardComponent
    ],
    providers: [ProfileFacadeService],
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<unknown>;
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private authStore = inject(AuthStore);
    private readonly layoutOrchestrator = inject(LayoutOrchestratorService);
    private readonly permissionsService = inject(PermissionsService);
    facade = inject(ProfileFacadeService);

    user = signal<User | null>(null);
    userRole = signal<UserRole>(UserRole.PLAYER);
    profileForm!: FormGroup;
    passwordForm!: FormGroup;
    isLoading = signal(false);
    isPasswordLoading = signal(false);

    isPending = computed(() => this.authStore.currentUser()?.status?.toLowerCase() === 'pending');
    activeSection = signal<'info' | 'password'>('info');
    isEditing = signal(false);

    readonly pageTitle = 'الملف الشخصي';
    readonly pageSubtitle = 'إدارة البيانات الشخصية وتحديث معلومات التواصل';
    roleBadge = computed(() => this.getRoleLabel(this.userRole()));
    displayId = computed(() => this.user()?.displayId || this.user()?.id || '');
    saveButtonLabel = computed(() => this.isEditing() ? 'حفظ التغييرات' : 'تحديث الملف الشخصي');
    isFormDisabled = computed(() => !this.isEditing());

    ngOnInit(): void {
        this.layoutOrchestrator.setTitle(this.pageTitle);
        this.layoutOrchestrator.setSubtitle(this.pageSubtitle);
        this.user.set(this.authService.getCurrentUser());
        this.userRole.set(this.user()?.role || UserRole.PLAYER);
        this.initForm();
        this.initPasswordForm();
        this.loadUserProfile();
        this.facade.loadLocations(this.user());
    }

    ngAfterViewInit(): void {
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
        this.facade.refreshStatus({
            setLoading: (v) => this.isLoading.set(v),
            onUser: () => this.loadUserProfile()
        });
    }

    loadUserProfile(): void {
        const currentUser = this.user();
        if (currentUser?.id) {
            this.facade.loadUserProfile(currentUser.id, {
                onData: (userData) => {
                    this.user.set(userData);
                    this.populateForm();
                    this.facade.loadLocations(userData);
                },
                onError: () => {
                    if (this.user()) this.populateForm();
                    this.facade.loadLocations(this.user());
                }
            });
        }
    }

    onGovernorateChange(value: unknown): void {
        this.facade.onGovernorateChange(value, this.profileForm);
    }

    onCityChange(value: unknown): void {
        this.facade.onCityChange(value, this.profileForm);
    }

    onDistrictChange(_value: unknown): void { /* kept for future side effects */ }

    private initForm(): void {
        this.profileForm = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(3)]],
            username: [{ value: '', disabled: true }],
            email: ['', [Validators.required, Validators.email]],
            phone: ['', [Validators.required, Validators.pattern(/^(01\d{9}|05\d{8})$/)]],
            nationalId: [{ value: '', disabled: true }],
            governorateId: [''],
            cityId: [''],
            areaId: [''],
            bio: ['']
        });
        this.disableFormFields();
    }

    private populateForm(): void {
        const currentUser = this.user();
        if (currentUser && this.profileForm) {
            this.profileForm.patchValue({
                name: currentUser.name || '',
                username: currentUser.email?.split('@')[0] || '',
                email: currentUser.email || '',
                phone: currentUser.phone || '',
                nationalId: currentUser.nationalId || '',
                governorateId: currentUser.governorateId || '',
                cityId: currentUser.cityId || '',
                areaId: currentUser.areaId || '',
                bio: ''
            });
        }
    }

    private initPasswordForm(): void {
        this.passwordForm = this.fb.group({
            currentPassword: ['', [Validators.required, Validators.minLength(6)]],
            newPassword: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', [Validators.required]]
        });
    }

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
        if (this.profileForm) this.profileForm.markAsPristine();
    }

    cancelEdit(): void {
        this.isEditing.set(false);
        this.disableFormFields();
        this.populateForm();
    }

    get hasChanges(): boolean {
        return this.profileForm?.dirty || false;
    }

    private enableFormFields(): void {
        if (this.profileForm) {
            Object.keys(this.profileForm.controls).forEach(key => {
                const control = this.profileForm.get(key);
                if (control && key !== 'username' && key !== 'nationalId') control.enable();
            });
        }
    }

    private disableFormFields(): void {
        if (this.profileForm) {
            Object.keys(this.profileForm.controls).forEach(key => {
                this.profileForm.get(key)?.disable();
            });
        }
    }

    saveProfile(): void {
        const currentUser = this.user();
        if (!currentUser) return;
        this.facade.saveProfile(currentUser, this.profileForm, {
            setLoading: (v) => this.isLoading.set(v),
            onSuccess: (updated) => {
                this.user.set(updated);
                this.authService.updateCurrentUser(updated);
                this.isEditing.set(false);
                this.disableFormFields();
            },
            onInvalid: () => { /* form already marked touched by facade */ }
        });
    }

    updatePassword(): void {
        this.facade.updatePassword(this.passwordForm, {
            setLoading: (v) => this.isPasswordLoading.set(v),
            onSuccess: () => this.passwordForm.reset()
        });
    }

    isCaptain(): boolean {
        return this.permissionsService.isTeamCaptain();
    }
}
