import { Injectable, inject, signal } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import {
    LocationService,
    GovernorateAdminDto, CityAdminDto, AreaAdminDto,
    CreateGovernorateRequest, CreateCityRequest, CreateAreaRequest,
    UpdateLocationRequest
} from '../../../core/services/location.service';
import { UIFeedbackService } from '../../../shared/services/ui-feedback.service';
import { SelectOption } from '../../../shared/components/select/select.component';
import { LocationTab, NewItemData, EditingItem } from './location-management.utils';

@Injectable()
export class LocationManagementFacade {
    private readonly locationService = inject(LocationService);
    private readonly uiFeedback = inject(UIFeedbackService);

    // ── Data signals ──
    readonly governorates = signal<GovernorateAdminDto[]>([]);
    readonly cities = signal<CityAdminDto[]>([]);
    readonly areas = signal<AreaAdminDto[]>([]);
    readonly isLoading = signal(false);
    readonly isSaving = signal(false);
    readonly totalCount = signal(0);
    readonly totalGovernorates = signal(0);
    readonly totalCities = signal(0);
    readonly totalAreas = signal(0);
    readonly governorateFilterOptions = signal<SelectOption[]>([]);
    readonly cityFilterOptions = signal<SelectOption[]>([]);

    // ── Data loading ──

    async loadData(
        tab: LocationTab, page: number, pageSize: number,
        search?: string, isActive?: boolean, govId?: string, cityId?: string
    ): Promise<void> {
        this.isLoading.set(true);

        try {
            if (tab === 'governorates') {
                const res = await firstValueFrom(this.locationService.getGovernoratesPaged(page, pageSize, search, isActive));
                this.governorates.set(res.items);
                this.totalCount.set(res.totalCount);
                this.totalGovernorates.set(res.totalCount);
            } else if (tab === 'cities') {
                const res = await firstValueFrom(this.locationService.getCitiesPaged(page, pageSize, govId, search, isActive));
                this.cities.set(res.items);
                this.totalCount.set(res.totalCount);
                this.totalCities.set(res.totalCount);
            } else {
                const res = await firstValueFrom(this.locationService.getAreasPaged(page, pageSize, cityId, search, isActive));
                this.areas.set(res.items);
                this.totalCount.set(res.totalCount);
                this.totalAreas.set(res.totalCount);
            }
        } catch {
            const label = tab === 'governorates' ? 'المحافظات' : tab === 'cities' ? 'المدن' : 'الأحياء';
            this.uiFeedback.error('خطأ', `فشل تحميل ${label}`);
        } finally {
            this.isLoading.set(false);
        }
    }

    async loadGovernorateOptions(): Promise<void> {
        try {
            const govs = await firstValueFrom(this.locationService.getGovernorates());
            this.governorateFilterOptions.set(
                [{ label: 'كل المحافظات', value: '' },
                ...govs.map(g => ({ label: g.nameAr, value: g.id }))]
            );
        } catch { /* ignore */ }
    }

    async loadCityOptions(governorateId: string): Promise<void> {
        if (!governorateId) {
            this.cityFilterOptions.set([]);
            return;
        }
        try {
            const cities = await firstValueFrom(this.locationService.getCities(governorateId));
            this.cityFilterOptions.set(
                [{ label: 'كل المدن', value: '' },
                ...cities.map(c => ({ label: c.nameAr, value: c.id }))]
            );
        } catch { /* ignore */ }
    }

    // ── CRUD operations ──

    async saveNewItem(tab: LocationTab, item: NewItemData, onSuccess: () => void): Promise<void> {
        if (!item.nameAr.trim()) {
            this.uiFeedback.error('خطأ', 'الاسم بالعربية مطلوب');
            return;
        }

        if (tab !== 'governorates' && !item.parentId) {
            this.uiFeedback.error('خطأ', tab === 'cities' ? 'يرجى اختيار المحافظة' : 'يرجى اختيار المدينة');
            return;
        }

        this.isSaving.set(true);
        let obs$: Observable<unknown>;

        if (tab === 'governorates') {
            const req: CreateGovernorateRequest = { nameAr: item.nameAr, nameEn: item.nameEn, sortOrder: item.sortOrder };
            obs$ = this.locationService.createGovernorate(req);
        } else if (tab === 'cities') {
            const req: CreateCityRequest = { nameAr: item.nameAr, nameEn: item.nameEn, governorateId: item.parentId, sortOrder: item.sortOrder };
            obs$ = this.locationService.createCity(req);
        } else {
            const req: CreateAreaRequest = { nameAr: item.nameAr, nameEn: item.nameEn, cityId: item.parentId, sortOrder: item.sortOrder };
            obs$ = this.locationService.createArea(req);
        }

        const label = tab === 'governorates' ? 'المحافظة' : tab === 'cities' ? 'المدينة' : 'الحي';
        try {
            await firstValueFrom(obs$);
            this.uiFeedback.success('تمت الإضافة', `تمت إضافة ${label} بنجاح`);
            onSuccess();
        } catch (err: unknown) {
            const httpErr = err as { error?: { message?: string } };
            this.uiFeedback.error('فشل', httpErr.error?.message || `فشل إضافة ${label}`);
        } finally {
            this.isSaving.set(false);
        }
    }

    async saveEdit(tab: LocationTab, item: EditingItem, onSuccess: () => void): Promise<void> {
        this.isSaving.set(true);
        const req: UpdateLocationRequest = { nameAr: item.nameAr, nameEn: item.nameEn, sortOrder: item.sortOrder };

        const obs$: Observable<unknown> = tab === 'governorates'
            ? this.locationService.updateGovernorate(item.id, req)
            : tab === 'cities'
              ? this.locationService.updateCity(item.id, req)
              : this.locationService.updateArea(item.id, req);

        try {
            await firstValueFrom(obs$);
            this.uiFeedback.success('تم التحديث', 'تم تحديث البيانات بنجاح');
            onSuccess();
        } catch (err: unknown) {
            const httpErr = err as { error?: { message?: string } };
            this.uiFeedback.error('فشل', httpErr.error?.message || 'فشل التحديث');
        } finally {
            this.isSaving.set(false);
        }
    }

    async toggleActive(tab: LocationTab, item: GovernorateAdminDto | CityAdminDto | AreaAdminDto, onSuccess: () => void): Promise<void> {
        const action = item.isActive ? 'تعطيل' : 'تفعيل';

        const confirmed = await firstValueFrom(this.uiFeedback.confirm(
            `تأكيد ${action}`,
            `هل تريد ${action} "${item.nameAr}"؟`,
            action,
            item.isActive ? 'danger' : 'info'
        ));
        if (!confirmed) return;

        try {
            let obs$: Observable<unknown>;
            if (tab === 'governorates') {
                obs$ = item.isActive
                    ? this.locationService.deactivateGovernorate(item.id)
                    : this.locationService.activateGovernorate(item.id);
            } else if (tab === 'cities') {
                const city = item as CityAdminDto;
                obs$ = item.isActive
                    ? this.locationService.deactivateCity(item.id, city.governorateId)
                    : this.locationService.activateCity(item.id, city.governorateId);
            } else {
                const area = item as AreaAdminDto;
                obs$ = item.isActive
                    ? this.locationService.deactivateArea(item.id, area.cityId)
                    : this.locationService.activateArea(item.id, area.cityId);
            }

            await firstValueFrom(obs$);
            const entityLabel = tab === 'governorates' ? 'المحافظة' : tab === 'cities' ? 'المدينة' : 'الحي';
            this.uiFeedback.success('تم', `تم ${action} ${entityLabel}`);
            onSuccess();
        } catch (err: unknown) {
            const httpErr = err as { error?: { message?: string } };
            this.uiFeedback.error('فشل', httpErr.error?.message || `فشل ${action}`);
        }
    }
}
