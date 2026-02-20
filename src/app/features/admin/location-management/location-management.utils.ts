import {
    GovernorateAdminDto, CityAdminDto, AreaAdminDto
} from '../../../core/services/location.service';

export type LocationTab = 'governorates' | 'cities' | 'areas';

export interface EditingItem {
    id: string;
    nameAr: string;
    nameEn: string;
    sortOrder: number;
}

export interface NewItemData {
    nameAr: string;
    nameEn: string;
    sortOrder: number;
    parentId: string;
}

export function getTabLabel(tab: LocationTab): string {
    return tab === 'governorates' ? 'محافظة' : tab === 'cities' ? 'مدينة' : 'حي';
}

export function getItemCount(item: GovernorateAdminDto | CityAdminDto | AreaAdminDto): number {
    if ('cityCount' in item) return item.cityCount;
    if ('areaCount' in item) return item.areaCount;
    if ('userCount' in item) return item.userCount;
    return 0;
}

export function asCityAdmin(item: GovernorateAdminDto | CityAdminDto | AreaAdminDto): CityAdminDto {
    return item as CityAdminDto;
}

export function asAreaAdmin(item: GovernorateAdminDto | CityAdminDto | AreaAdminDto): AreaAdminDto {
    return item as AreaAdminDto;
}

export function getActiveList(
    tab: LocationTab,
    governorates: GovernorateAdminDto[],
    cities: CityAdminDto[],
    areas: AreaAdminDto[]
): (GovernorateAdminDto | CityAdminDto | AreaAdminDto)[] {
    if (tab === 'governorates') return governorates;
    if (tab === 'cities') return cities;
    return areas;
}
