import { IconComponent } from '../../../shared/components/icon/icon.component';
import {
    Component, OnInit, OnDestroy, AfterViewInit, inject, signal, computed,
    ViewChild, TemplateRef, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LayoutOrchestratorService } from '../../../core/services/layout-orchestrator.service';
import { UIFeedbackService } from '../../../shared/services/ui-feedback.service';
import {
    LocationService,
    GovernorateAdminDto, CityAdminDto, AreaAdminDto,
    CreateGovernorateRequest, CreateCityRequest, CreateAreaRequest,
    UpdateLocationRequest
} from '../../../core/services/location.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { InlineLoadingComponent } from '../../../shared/components/inline-loading/inline-loading.component';
import { FilterComponent } from '../../../shared/components/filter/filter.component';
import { FormControlComponent } from '../../../shared/components/form-control/form-control.component';
import { SelectComponent, SelectOption } from '../../../shared/components/select/select.component';
import { finalize } from 'rxjs';

type LocationTab = 'governorates' | 'cities' | 'areas';

interface EditingItem {
    id: string;
    nameAr: string;
    nameEn: string;
    sortOrder: number;
}

@Component({
    selector: 'app-location-management',
    standalone: true,
    imports: [
        IconComponent, CommonModule, FormsModule,
        ButtonComponent, BadgeComponent, EmptyStateComponent,
        InlineLoadingComponent, FilterComponent, FormControlComponent,
        SelectComponent
    ],
    templateUrl: './location-management.component.html',
    styleUrls: ['./location-management.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LocationManagementComponent implements OnInit, AfterViewInit, OnDestroy {
    private readonly locationService = inject(LocationService);
    private readonly uiFeedback = inject(UIFeedbackService);
    private readonly layout = inject(LayoutOrchestratorService);

    @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<unknown>;
    @ViewChild('filtersTemplate') filtersTemplate!: TemplateRef<unknown>;

    // ── Tab state ──
    activeTab = signal<LocationTab>('governorates');
    tabs = [
        { label: 'المحافظات', value: 'governorates', icon: 'location_on' },
        { label: 'المدن', value: 'cities', icon: 'location_city' },
        { label: 'الأحياء', value: 'areas', icon: 'home' }
    ];

    // ── Data ──
    governorates = signal<GovernorateAdminDto[]>([]);
    cities = signal<CityAdminDto[]>([]);
    areas = signal<AreaAdminDto[]>([]);

    isLoading = signal(false);
    isSaving = signal(false);

    // ── Filters ──
    searchQuery = signal('');
    statusFilter = signal<'all' | 'active' | 'inactive'>('all');
    selectedGovernorateId = signal('');
    selectedCityId = signal('');

    // ── Governorate/City options for filters ──
    governorateFilterOptions = signal<SelectOption[]>([]);
    cityFilterOptions = signal<SelectOption[]>([]);

    // ── Add form ──
    showAddForm = signal(false);
    newItem = signal({ nameAr: '', nameEn: '', sortOrder: 0, parentId: '' });

    // ── Edit state ──
    editingItem = signal<EditingItem | null>(null);

    // ── Pagination ──
    currentPage = signal(1);
    totalCount = signal(0);
    readonly pageSize = 20;
    totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize) || 1);

    // ── Stats ──
    totalGovernorates = signal(0);
    totalCities = signal(0);
    totalAreas = signal(0);

    ngOnInit(): void {
        this.layout.setTitle('إدارة المناطق');
        this.layout.setSubtitle('إضافة وتعديل المحافظات والمدن والأحياء');
        this.loadData();
        this.loadGovernorateOptions();
    }

    ngAfterViewInit(): void {
        queueMicrotask(() => {
            if (this.actionsTemplate) this.layout.setActions(this.actionsTemplate);
            if (this.filtersTemplate) this.layout.setFilters(this.filtersTemplate);
        });
    }

    ngOnDestroy(): void {
        this.layout.reset();
    }

    // ─────────────────────────────────────────
    //  Tab switching
    // ─────────────────────────────────────────

    setTab(tab: unknown): void {
        this.activeTab.set(tab as LocationTab);
        this.currentPage.set(1);
        this.showAddForm.set(false);
        this.editingItem.set(null);
        this.searchQuery.set('');

        if (tab === 'cities') {
            this.loadGovernorateOptions();
        } else if (tab === 'areas' && this.selectedGovernorateId()) {
            this.loadCityOptions(this.selectedGovernorateId());
        }

        this.loadData();
    }

    // ─────────────────────────────────────────
    //  Data loading
    // ─────────────────────────────────────────

    loadData(): void {
        const tab = this.activeTab();
        const page = this.currentPage();
        const search = this.searchQuery() || undefined;
        const isActive = this.statusFilter() === 'all' ? undefined : this.statusFilter() === 'active';

        this.isLoading.set(true);

        if (tab === 'governorates') {
            this.locationService.getGovernoratesPaged(page, this.pageSize, search, isActive)
                .pipe(finalize(() => this.isLoading.set(false)))
                .subscribe({
                    next: (res) => {
                        this.governorates.set(res.items);
                        this.totalCount.set(res.totalCount);
                        this.totalGovernorates.set(res.totalCount);
                    },
                    error: () => this.uiFeedback.error('خطأ', 'فشل تحميل المحافظات')
                });
        } else if (tab === 'cities') {
            const govId = this.selectedGovernorateId() || undefined;
            this.locationService.getCitiesPaged(page, this.pageSize, govId, search, isActive)
                .pipe(finalize(() => this.isLoading.set(false)))
                .subscribe({
                    next: (res) => {
                        this.cities.set(res.items);
                        this.totalCount.set(res.totalCount);
                        this.totalCities.set(res.totalCount);
                    },
                    error: () => this.uiFeedback.error('خطأ', 'فشل تحميل المدن')
                });
        } else {
            const cityId = this.selectedCityId() || undefined;
            this.locationService.getAreasPaged(page, this.pageSize, cityId, search, isActive)
                .pipe(finalize(() => this.isLoading.set(false)))
                .subscribe({
                    next: (res) => {
                        this.areas.set(res.items);
                        this.totalCount.set(res.totalCount);
                        this.totalAreas.set(res.totalCount);
                    },
                    error: () => this.uiFeedback.error('خطأ', 'فشل تحميل الأحياء')
                });
        }
    }

    loadGovernorateOptions(): void {
        this.locationService.getGovernorates().subscribe({
            next: (govs) => {
                this.governorateFilterOptions.set(
                    [{ label: 'كل المحافظات', value: '' },
                    ...govs.map(g => ({ label: g.nameAr, value: g.id }))]
                );
            }
        });
    }

    loadCityOptions(governorateId: string): void {
        if (!governorateId) {
            this.cityFilterOptions.set([]);
            return;
        }
        this.locationService.getCities(governorateId).subscribe({
            next: (cities) => {
                this.cityFilterOptions.set(
                    [{ label: 'كل المدن', value: '' },
                    ...cities.map(c => ({ label: c.nameAr, value: c.id }))]
                );
            }
        });
    }

    // ─────────────────────────────────────────
    //  Filter handlers
    // ─────────────────────────────────────────

    onSearchChange(query: string): void {
        this.searchQuery.set(query);
        this.currentPage.set(1);
        this.loadData();
    }

    onStatusChange(status: unknown): void {
        this.statusFilter.set(status as 'all' | 'active' | 'inactive');
        this.currentPage.set(1);
        this.loadData();
    }

    onGovernorateFilterChange(govId: unknown): void {
        const id = typeof govId === 'object' && govId !== null ? (govId as any).value : govId;
        this.selectedGovernorateId.set(id as string || '');
        this.selectedCityId.set('');
        this.cityFilterOptions.set([]);
        this.currentPage.set(1);

        if (this.activeTab() === 'areas' && id) {
            this.loadCityOptions(id as string);
        }
        this.loadData();
    }

    onCityFilterChange(cityId: unknown): void {
        const id = typeof cityId === 'object' && cityId !== null ? (cityId as any).value : cityId;
        this.selectedCityId.set(id as string || '');
        this.currentPage.set(1);
        this.loadData();
    }

    // ─────────────────────────────────────────
    //  Add
    // ─────────────────────────────────────────

    toggleAddForm(): void {
        this.showAddForm.update(v => !v);
        if (this.showAddForm()) {
            this.editingItem.set(null);
            this.newItem.set({ nameAr: '', nameEn: '', sortOrder: 0, parentId: '' });
        }
    }

    saveNewItem(): void {
        const item = this.newItem();
        if (!item.nameAr.trim()) {
            this.uiFeedback.error('خطأ', 'الاسم بالعربية مطلوب');
            return;
        }

        this.isSaving.set(true);
        const tab = this.activeTab();

        if (tab === 'governorates') {
            const req: CreateGovernorateRequest = { nameAr: item.nameAr, nameEn: item.nameEn, sortOrder: item.sortOrder };
            this.locationService.createGovernorate(req)
                .pipe(finalize(() => this.isSaving.set(false)))
                .subscribe({
                    next: () => {
                        this.uiFeedback.success('تمت الإضافة', 'تمت إضافة المحافظة بنجاح');
                        this.showAddForm.set(false);
                        this.loadData();
                        this.loadGovernorateOptions();
                    },
                    error: (err) => this.uiFeedback.error('فشل', err.error?.message || 'فشل إضافة المحافظة')
                });
        } else if (tab === 'cities') {
            if (!item.parentId) {
                this.uiFeedback.error('خطأ', 'يرجى اختيار المحافظة');
                this.isSaving.set(false);
                return;
            }
            const req: CreateCityRequest = { nameAr: item.nameAr, nameEn: item.nameEn, governorateId: item.parentId, sortOrder: item.sortOrder };
            this.locationService.createCity(req)
                .pipe(finalize(() => this.isSaving.set(false)))
                .subscribe({
                    next: () => {
                        this.uiFeedback.success('تمت الإضافة', 'تمت إضافة المدينة بنجاح');
                        this.showAddForm.set(false);
                        this.loadData();
                    },
                    error: (err) => this.uiFeedback.error('فشل', err.error?.message || 'فشل إضافة المدينة')
                });
        } else {
            if (!item.parentId) {
                this.uiFeedback.error('خطأ', 'يرجى اختيار المدينة');
                this.isSaving.set(false);
                return;
            }
            const req: CreateAreaRequest = { nameAr: item.nameAr, nameEn: item.nameEn, cityId: item.parentId, sortOrder: item.sortOrder };
            this.locationService.createArea(req)
                .pipe(finalize(() => this.isSaving.set(false)))
                .subscribe({
                    next: () => {
                        this.uiFeedback.success('تمت الإضافة', 'تمت إضافة الحي بنجاح');
                        this.showAddForm.set(false);
                        this.loadData();
                    },
                    error: (err) => this.uiFeedback.error('فشل', err.error?.message || 'فشل إضافة الحي')
                });
        }
    }

    // ─────────────────────────────────────────
    //  Edit
    // ─────────────────────────────────────────

    startEdit(item: GovernorateAdminDto | CityAdminDto | AreaAdminDto): void {
        this.showAddForm.set(false);
        this.editingItem.set({
            id: item.id,
            nameAr: item.nameAr,
            nameEn: item.nameEn,
            sortOrder: item.sortOrder
        });
    }

    cancelEdit(): void {
        this.editingItem.set(null);
    }

    saveEdit(): void {
        const item = this.editingItem();
        if (!item) return;

        this.isSaving.set(true);
        const req: UpdateLocationRequest = { nameAr: item.nameAr, nameEn: item.nameEn, sortOrder: item.sortOrder };
        const tab = this.activeTab();

        const done = () => {
            this.isSaving.set(false);
            this.uiFeedback.success('تم التحديث', 'تم تحديث البيانات بنجاح');
            this.editingItem.set(null);
            this.loadData();
            if (tab === 'governorates') this.loadGovernorateOptions();
        };
        const fail = (err: any) => {
            this.isSaving.set(false);
            this.uiFeedback.error('فشل', err.error?.message || 'فشل التحديث');
        };

        if (tab === 'governorates') {
            this.locationService.updateGovernorate(item.id, req).subscribe({ next: done, error: fail });
        } else if (tab === 'cities') {
            this.locationService.updateCity(item.id, req).subscribe({ next: done, error: fail });
        } else {
            this.locationService.updateArea(item.id, req).subscribe({ next: done, error: fail });
        }
    }

    // ─────────────────────────────────────────
    //  Activate / Deactivate
    // ─────────────────────────────────────────

    toggleActive(item: GovernorateAdminDto | CityAdminDto | AreaAdminDto): void {
        const tab = this.activeTab();
        const action = item.isActive ? 'تعطيل' : 'تفعيل';

        this.uiFeedback.confirm(
            `تأكيد ${action}`,
            `هل تريد ${action} "${item.nameAr}"؟`,
            action,
            item.isActive ? 'danger' : 'info'
        ).subscribe((confirmed: boolean) => {
            if (!confirmed) return;

            if (tab === 'governorates') {
                const obs$ = item.isActive
                    ? this.locationService.deactivateGovernorate(item.id)
                    : this.locationService.activateGovernorate(item.id);
                obs$.subscribe({
                    next: () => { this.uiFeedback.success('تم', `تم ${action} المحافظة`); this.loadData(); },
                    error: (err: any) => this.uiFeedback.error('فشل', err.error?.message || `فشل ${action}`)
                });
            } else if (tab === 'cities') {
                const city = item as CityAdminDto;
                const obs$ = item.isActive
                    ? this.locationService.deactivateCity(item.id, city.governorateId)
                    : this.locationService.activateCity(item.id, city.governorateId);
                obs$.subscribe({
                    next: () => { this.uiFeedback.success('تم', `تم ${action} المدينة`); this.loadData(); },
                    error: (err: any) => this.uiFeedback.error('فشل', err.error?.message || `فشل ${action}`)
                });
            } else {
                const area = item as AreaAdminDto;
                const obs$ = item.isActive
                    ? this.locationService.deactivateArea(item.id, area.cityId)
                    : this.locationService.activateArea(item.id, area.cityId);
                obs$.subscribe({
                    next: () => { this.uiFeedback.success('تم', `تم ${action} الحي`); this.loadData(); },
                    error: (err: any) => this.uiFeedback.error('فشل', err.error?.message || `فشل ${action}`)
                });
            }
        });
    }

    // ─────────────────────────────────────────
    //  Pagination
    // ─────────────────────────────────────────

    goToPage(page: number): void {
        if (page < 1 || page > this.totalPages()) return;
        this.currentPage.set(page);
        this.loadData();
    }

    // ─────────────────────────────────────────
    //  Parent select options for add form
    // ─────────────────────────────────────────

    get parentOptions(): SelectOption[] {
        if (this.activeTab() === 'cities') {
            return this.governorateFilterOptions().filter(o => o.value !== '');
        }
        if (this.activeTab() === 'areas') {
            return this.cityFilterOptions().filter(o => o.value !== '');
        }
        return [];
    }

    get parentLabel(): string {
        return this.activeTab() === 'cities' ? 'المحافظة' : 'المدينة';
    }

    get tabLabel(): string {
        const t = this.activeTab();
        return t === 'governorates' ? 'محافظة' : t === 'cities' ? 'مدينة' : 'حي';
    }

    // ─────────────────────────────────────────
    //  Template helpers
    // ─────────────────────────────────────────

    getActiveList(): (GovernorateAdminDto | CityAdminDto | AreaAdminDto)[] {
        const tab = this.activeTab();
        if (tab === 'governorates') return this.governorates();
        if (tab === 'cities') return this.cities();
        return this.areas();
    }

    getItemCount(item: GovernorateAdminDto | CityAdminDto | AreaAdminDto): number {
        if ('cityCount' in item) return item.cityCount;
        if ('areaCount' in item) return item.areaCount;
        if ('userCount' in item) return item.userCount;
        return 0;
    }

    asCityAdmin(item: GovernorateAdminDto | CityAdminDto | AreaAdminDto): CityAdminDto {
        return item as CityAdminDto;
    }

    asAreaAdmin(item: GovernorateAdminDto | CityAdminDto | AreaAdminDto): AreaAdminDto {
        return item as AreaAdminDto;
    }

    // ── Signal update helpers (Angular templates don't support arrow functions) ──

    updateNewItemField(field: string, value: any): void {
        const current = this.newItem();
        this.newItem.set({ ...current, [field]: field === 'sortOrder' ? +value : value });
    }

    updateEditingField(field: string, value: any): void {
        const current = this.editingItem();
        if (!current) return;
        this.editingItem.set({ ...current, [field]: field === 'sortOrder' ? +value : value });
    }
}
