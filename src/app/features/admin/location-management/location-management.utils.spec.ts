import {
  getTabLabel,
  getItemCount,
  asCityAdmin,
  asAreaAdmin,
  getActiveList,
  LocationTab,
} from './location-management.utils';
import {
  GovernorateAdminDto,
  CityAdminDto,
  AreaAdminDto,
} from '../../../core/services/location.service';

// ── getTabLabel ─────────────────────────────────────────────

describe('getTabLabel', () => {
  it('should return "محافظة" for governorates tab', () => {
    expect(getTabLabel('governorates')).toBe('محافظة');
  });

  it('should return "مدينة" for cities tab', () => {
    expect(getTabLabel('cities')).toBe('مدينة');
  });

  it('should return "حي" for areas tab', () => {
    expect(getTabLabel('areas')).toBe('حي');
  });
});

// ── getItemCount ────────────────────────────────────────────

describe('getItemCount', () => {
  it('should return cityCount for a GovernorateAdminDto', () => {
    const gov: GovernorateAdminDto = {
      id: '1', nameAr: 'القاهرة', nameEn: 'Cairo',
      isActive: true, sortOrder: 1, cityCount: 5, userCount: 100, createdAt: '2024-01-01',
    };
    expect(getItemCount(gov)).toBe(5);
  });

  it('should return areaCount for a CityAdminDto', () => {
    const city: CityAdminDto = {
      id: '1', nameAr: 'مدينة نصر', nameEn: 'Nasr City',
      governorateId: 'g1', governorateNameAr: 'القاهرة',
      isActive: true, sortOrder: 1, areaCount: 10, userCount: 50, createdAt: '2024-01-01',
    };
    expect(getItemCount(city)).toBe(10);
  });

  it('should return userCount for an AreaAdminDto', () => {
    const area: AreaAdminDto = {
      id: '1', nameAr: 'المعادي', nameEn: 'Maadi',
      cityId: 'c1', cityNameAr: 'القاهرة',
      isActive: true, sortOrder: 1, userCount: 25, createdAt: '2024-01-01',
    };
    expect(getItemCount(area)).toBe(25);
  });
});

// ── asCityAdmin / asAreaAdmin ───────────────────────────────

describe('asCityAdmin', () => {
  it('should cast item to CityAdminDto', () => {
    const city: CityAdminDto = {
      id: '1', nameAr: 'Test', nameEn: 'Test',
      governorateId: 'g1', governorateNameAr: 'Gov',
      isActive: true, sortOrder: 0, areaCount: 3, userCount: 10, createdAt: '2024-01-01',
    };
    const result = asCityAdmin(city);
    expect(result.governorateId).toBe('g1');
  });
});

describe('asAreaAdmin', () => {
  it('should cast item to AreaAdminDto', () => {
    const area: AreaAdminDto = {
      id: '1', nameAr: 'Test', nameEn: 'Test',
      cityId: 'c1', cityNameAr: 'City',
      isActive: true, sortOrder: 0, userCount: 5, createdAt: '2024-01-01',
    };
    const result = asAreaAdmin(area);
    expect(result.cityId).toBe('c1');
  });
});

// ── getActiveList ───────────────────────────────────────────

describe('getActiveList', () => {
  const governorates: GovernorateAdminDto[] = [
    { id: 'g1', nameAr: 'القاهرة', nameEn: 'Cairo', isActive: true, sortOrder: 1, cityCount: 3, userCount: 100, createdAt: '2024-01-01' },
  ];
  const cities: CityAdminDto[] = [
    { id: 'c1', nameAr: 'مدينة نصر', nameEn: 'Nasr', governorateId: 'g1', governorateNameAr: 'القاهرة', isActive: true, sortOrder: 1, areaCount: 2, userCount: 50, createdAt: '2024-01-01' },
  ];
  const areas: AreaAdminDto[] = [
    { id: 'a1', nameAr: 'المعادي', nameEn: 'Maadi', cityId: 'c1', cityNameAr: 'مدينة نصر', isActive: true, sortOrder: 1, userCount: 20, createdAt: '2024-01-01' },
  ];

  it('should return governorates for "governorates" tab', () => {
    expect(getActiveList('governorates', governorates, cities, areas)).toBe(governorates);
  });

  it('should return cities for "cities" tab', () => {
    expect(getActiveList('cities', governorates, cities, areas)).toBe(cities);
  });

  it('should return areas for "areas" tab', () => {
    expect(getActiveList('areas', governorates, cities, areas)).toBe(areas);
  });
});
