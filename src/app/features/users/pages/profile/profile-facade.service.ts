import { Injectable, inject, signal } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { UserService } from '../../../../core/services/user.service';
import { LocationService, GovernorateDto, CityDto, AreaDto } from '../../../../core/services/location.service';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { SelectOption } from '../../../../shared/components/select/select.component';
import { User } from '../../../../core/models/user.model';

@Injectable()
export class ProfileFacadeService {
    private locationService = inject(LocationService);
    private userService = inject(UserService);
    private authService = inject(AuthService);
    private uiFeedback = inject(UIFeedbackService);

    // Location state
    governorateOptions = signal<SelectOption[]>([]);
    cityOptions = signal<SelectOption[]>([]);
    districtOptions = signal<SelectOption[]>([]);
    isLocationsLoading = signal(false);
    isLoadingCities = signal(false);
    isLoadingAreas = signal(false);

    // ==================== LOCATION CASCADE ====================

    async loadLocations(user: User | null): Promise<void> {
        this.isLocationsLoading.set(true);
        try {
            const governorates: GovernorateDto[] = await firstValueFrom(this.locationService.getGovernorates());
            this.governorateOptions.set(governorates.map(g => ({
                label: g.nameAr, value: g.id, icon: 'location_on'
            })));
            this.isLocationsLoading.set(false);
            if (user?.governorateId) {
                this.loadCities(user.governorateId, user);
            }
        } catch (error) {
            console.error('Error loading governorates:', error);
            this.isLocationsLoading.set(false);
        }
    }

    async loadCities(governorateId: string, user?: User | null): Promise<void> {
        if (!governorateId) return;
        this.isLoadingCities.set(true);
        try {
            const cities: CityDto[] = await firstValueFrom(this.locationService.getCities(governorateId));
            this.cityOptions.set(cities.map(c => ({
                label: c.nameAr, value: c.id, icon: 'location_city'
            })));
            this.isLoadingCities.set(false);
            if (user?.cityId) {
                this.loadAreas(user.cityId);
            }
        } catch (error) {
            console.error('Error loading cities:', error);
            this.isLoadingCities.set(false);
        }
    }

    async loadAreas(cityId: string): Promise<void> {
        if (!cityId) return;
        this.isLoadingAreas.set(true);
        try {
            const areas: AreaDto[] = await firstValueFrom(this.locationService.getAreas(cityId));
            this.districtOptions.set(areas.map(a => ({
                label: a.nameAr, value: a.id, icon: 'home'
            })));
            this.isLoadingAreas.set(false);
        } catch (error) {
            console.error('Error loading areas:', error);
            this.isLoadingAreas.set(false);
        }
    }

    onGovernorateChange(value: unknown, profileForm: FormGroup): void {
        const governorateId = typeof value === 'object' && value !== null ? (value as { value: string }).value : (value as string);
        profileForm.patchValue({ cityId: '', areaId: '' });
        this.cityOptions.set([]);
        this.districtOptions.set([]);
        if (governorateId) {
            this.loadCities(governorateId);
        }
    }

    onCityChange(value: unknown, profileForm: FormGroup): void {
        const cityId = typeof value === 'object' && value !== null ? (value as { value: string }).value : (value as string);
        profileForm.patchValue({ areaId: '' });
        this.districtOptions.set([]);
        if (cityId) {
            this.loadAreas(cityId);
        }
    }

    // ==================== PROFILE SAVE ====================

    async saveProfile(
        user: User,
        profileForm: FormGroup,
        callbacks: { setLoading: (v: boolean) => void; onSuccess: (updated: User) => void; onInvalid: () => void }
    ): Promise<void> {
        if (!profileForm.valid) {
            Object.keys(profileForm.controls).forEach(key => profileForm.get(key)?.markAsTouched());
            this.uiFeedback.error('بيانات غير صحيحة', 'يرجى التأكد من صحة جميع الحقول المطلوبة (الاسم، البريد الإلكتروني، رقم الهاتف)');
            callbacks.onInvalid();
            return;
        }

        callbacks.setLoading(true);
        const updateData: Record<string, unknown> = {};
        const formValue = profileForm.getRawValue();
        Object.keys(formValue).forEach(key => {
            if (key !== 'username' && key !== 'nationalId') {
                updateData[key] = formValue[key];
            }
        });

        try {
            const updated = await firstValueFrom(this.userService.updateUser(user.id, updateData));
            callbacks.onSuccess(updated);
            this.uiFeedback.success('تم التحديث', 'تم تحديث بيانات الملف الشخصي بنجاح');
        } catch (error: unknown) {
            console.error('Error updating user:', error);
            const httpErr = error as { error?: { message?: string } };
            const message = httpErr.error?.message || 'تعذّر تحديث الملف الشخصي. يرجى المحاولة مرة أخرى.';
            this.uiFeedback.error('فشل التحديث', message);
        } finally {
            callbacks.setLoading(false);
        }
    }

    // ==================== PASSWORD UPDATE ====================

    async updatePassword(
        passwordForm: FormGroup,
        callbacks: { setLoading: (v: boolean) => void; onSuccess: () => void }
    ): Promise<void> {
        if (!passwordForm.valid) return;

        const { currentPassword, newPassword, confirmPassword } = passwordForm.value;
        if (newPassword !== confirmPassword) {
            this.uiFeedback.error('كلمة المرور غير متطابقة', 'كلمة المرور الجديدة وتأكيدها غير متطابقين. يرجى إعادة الإدخال.');
            return;
        }

        callbacks.setLoading(true);
        try {
            await firstValueFrom(this.authService.changePassword(currentPassword, newPassword));
            callbacks.onSuccess();
            this.uiFeedback.success('تم التغيير', 'تم تغيير كلمة المرور بنجاح');
        } catch (error: unknown) {
            const httpErr = error as { error?: { message?: string } };
            const message = httpErr.error?.message || 'تعذّر تغيير كلمة المرور. تأكد من كلمة المرور الحالية وحاول مرة أخرى.';
            this.uiFeedback.error('فشل تغيير كلمة المرور', message);
        } finally {
            callbacks.setLoading(false);
        }
    }

    // ==================== STATUS REFRESH ====================

    async refreshStatus(callbacks: { setLoading: (v: boolean) => void; onUser: (user: User) => void }): Promise<void> {
        callbacks.setLoading(true);
        try {
            const user = await firstValueFrom(this.authService.refreshUserProfile());
            if (user?.status?.toLowerCase() === 'active') {
                this.uiFeedback.success('تم التفعيل', 'تم تفعيل حسابك بنجاح!');
                callbacks.onUser(user);
            } else {
                this.uiFeedback.info('لا يزال قيد المراجعة', 'حسابك لا يزال قيد المراجعة من قبل الإدارة.');
            }
        } catch {
            this.uiFeedback.error('فشل التحديث', 'تعذّر التحقق من حالة الحساب. يرجى المحاولة مرة أخرى.');
        } finally {
            callbacks.setLoading(false);
        }
    }

    // ==================== LOAD USER PROFILE ====================

    async loadUserProfile(
        userId: string,
        callbacks: { onData: (user: User) => void; onError: () => void }
    ): Promise<void> {
        try {
            const userData = await firstValueFrom(this.userService.getUserById(userId));
            callbacks.onData(userData);
        } catch (error) {
            console.error('Error loading user profile:', error);
            callbacks.onError();
        }
    }
}
