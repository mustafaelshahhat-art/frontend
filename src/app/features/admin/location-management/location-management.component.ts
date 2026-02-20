import { IconComponent } from '../../../shared/components/icon/icon.component';
import {
    Component, OnInit, OnDestroy, AfterViewInit, inject, signal, computed,
    ViewChild, TemplateRef, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LayoutOrchestratorService } from '../../../core/services/layout-orchestrator.service';
import {
    GovernorateAdminDto, CityAdminDto, AreaAdminDto
} from '../../../core/services/location.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { InlineLoadingComponent } from '../../../shared/components/inline-loading/inline-loading.component';
import { FilterComponent } from '../../../shared/components/filter/filter.component';
import { FormControlComponent } from '../../../shared/components/form-control/form-control.component';
import { SelectComponent, SelectOption } from '../../../shared/components/select/select.component';
import { LocationManagementFacade } from './location-management-facade.service';
import {
    LocationTab, EditingItem,
    getTabLabel, getItemCount, asCityAdmin, asAreaAdmin, getActiveList as getActiveListFn
} from './location-management.utils';

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
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [LocationManagementFacade]
})
export class LocationManagementComponent implements OnInit, AfterViewInit, OnDestroy {
    readonly facade = inject(LocationManagementFacade);
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

    // ── Proxy facade signals for template ──
    readonly isLoading = this.facade.isLoading;
    readonly isSaving = this.facade.isSaving;
    readonly governorateFilterOptions = this.facade.governorateFilterOptions;
    readonly cityFilterOptions = this.facade.cityFilterOptions;
    readonly totalGovernorates = this.facade.totalGovernorates;
    readonly totalCities = this.facade.totalCities;
    readonly totalAreas = this.facade.totalAreas;

    // ── UI state ──
    showAddForm = signal(false);
    newItem = signal({ nameAr: '', nameEn: '', sortOrder: 0, parentId: '' });
    editingItem = signal<EditingItem | null>(null);

    // ── Filters ──
    searchQuery = signal('');
    statusFilter = signal<'all' | 'active' | 'inactive'>('all');
    selectedGovernorateId = signal('');
    selectedCityId = signal('');

    // ── Pagination ──
    currentPage = signal(1);
    readonly pageSize = 20;
    totalPages = computed(() => Math.ceil(this.facade.totalCount() / this.pageSize) || 1);

    ngOnInit(): void {
        this.layout.setTitle('إدارة المناطق');
        this.layout.setSubtitle('إضافة وتعديل المحافظات والمدن والأحياء');
        this.reloadData();
        this.facade.loadGovernorateOptions();
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

    setTab(tab: unknown): void {
        this.activeTab.set(tab as LocationTab);
        this.currentPage.set(1);
        this.showAddForm.set(false);
        this.editingItem.set(null);
        this.searchQuery.set('');
        if (tab === 'cities') this.facade.loadGovernorateOptions();
        else if (tab === 'areas' && this.selectedGovernorateId())
            this.facade.loadCityOptions(this.selectedGovernorateId());
        this.reloadData();
    }

    private reloadData(): void {
        const search = this.searchQuery() || undefined;
        const isActive = this.statusFilter() === 'all' ? undefined : this.statusFilter() === 'active';
        this.facade.loadData(this.activeTab(), this.currentPage(), this.pageSize,
            search, isActive, this.selectedGovernorateId() || undefined,
            this.selectedCityId() || undefined);
    }

    onSearchChange(query: string): void {
        this.searchQuery.set(query);
        this.currentPage.set(1);
        this.reloadData();
    }

    onStatusChange(status: unknown): void {
        this.statusFilter.set(status as 'all' | 'active' | 'inactive');
        this.currentPage.set(1);
        this.reloadData();
    }

    onGovernorateFilterChange(govId: unknown): void {
        const id = typeof govId === 'object' && govId !== null ? (govId as { value: string }).value : govId;
        this.selectedGovernorateId.set(id as string || '');
        this.selectedCityId.set('');
        this.facade.cityFilterOptions.set([]);
        this.currentPage.set(1);
        if (this.activeTab() === 'areas' && id) this.facade.loadCityOptions(id as string);
        this.reloadData();
    }

    onCityFilterChange(cityId: unknown): void {
        const id = typeof cityId === 'object' && cityId !== null ? (cityId as { value: string }).value : cityId;
        this.selectedCityId.set(id as string || '');
        this.currentPage.set(1);
        this.reloadData();
    }

    toggleAddForm(): void {
        this.showAddForm.update(v => !v);
        if (this.showAddForm()) {
            this.editingItem.set(null);
            this.newItem.set({ nameAr: '', nameEn: '', sortOrder: 0, parentId: '' });
        }
    }

    saveNewItem(): void {
        this.facade.saveNewItem(this.activeTab(), this.newItem(), () => {
            this.showAddForm.set(false);
            this.reloadData();
            if (this.activeTab() === 'governorates') this.facade.loadGovernorateOptions();
        });
    }

    startEdit(item: GovernorateAdminDto | CityAdminDto | AreaAdminDto): void {
        this.showAddForm.set(false);
        this.editingItem.set({
            id: item.id, nameAr: item.nameAr,
            nameEn: item.nameEn, sortOrder: item.sortOrder
        });
    }

    cancelEdit(): void {
        this.editingItem.set(null);
    }

    saveEdit(): void {
        const item = this.editingItem();
        if (!item) return;
        this.facade.saveEdit(this.activeTab(), item, () => {
            this.editingItem.set(null);
            this.reloadData();
            if (this.activeTab() === 'governorates') this.facade.loadGovernorateOptions();
        });
    }

    toggleActive(item: GovernorateAdminDto | CityAdminDto | AreaAdminDto): void {
        this.facade.toggleActive(this.activeTab(), item, () => this.reloadData());
    }

    goToPage(page: number): void {
        if (page < 1 || page > this.totalPages()) return;
        this.currentPage.set(page);
        this.reloadData();
    }

    get parentOptions(): SelectOption[] {
        if (this.activeTab() === 'cities') return this.governorateFilterOptions().filter(o => o.value !== '');
        if (this.activeTab() === 'areas') return this.cityFilterOptions().filter(o => o.value !== '');
        return [];
    }

    get parentLabel(): string {
        return this.activeTab() === 'cities' ? 'المحافظة' : 'المدينة';
    }

    get tabLabel(): string {
        return getTabLabel(this.activeTab());
    }

    getActiveList(): (GovernorateAdminDto | CityAdminDto | AreaAdminDto)[] {
        return getActiveListFn(this.activeTab(), this.facade.governorates(), this.facade.cities(), this.facade.areas());
    }

    getItemCount = getItemCount;
    asCityAdmin = asCityAdmin;
    asAreaAdmin = asAreaAdmin;

    updateNewItemField(field: string, value: string | number): void {
        const current = this.newItem();
        this.newItem.set({ ...current, [field]: field === 'sortOrder' ? +value : value });
    }

    updateEditingField(field: string, value: string | number): void {
        const current = this.editingItem();
        if (!current) return;
        this.editingItem.set({ ...current, [field]: field === 'sortOrder' ? +value : value });
    }
}
