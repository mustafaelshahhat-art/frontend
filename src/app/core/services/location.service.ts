import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── DTOs matching backend ──

export interface GovernorateDto {
    id: string;
    nameAr: string;
    nameEn: string;
}

export interface CityDto {
    id: string;
    nameAr: string;
    nameEn: string;
    governorateId: string;
}

export interface AreaDto {
    id: string;
    nameAr: string;
    nameEn: string;
    cityId: string;
}

// ── Admin DTOs ──

export interface GovernorateAdminDto {
    id: string;
    nameAr: string;
    nameEn: string;
    isActive: boolean;
    sortOrder: number;
    cityCount: number;
    userCount: number;
    createdAt: string;
}

export interface CityAdminDto {
    id: string;
    nameAr: string;
    nameEn: string;
    governorateId: string;
    governorateNameAr: string;
    isActive: boolean;
    sortOrder: number;
    areaCount: number;
    userCount: number;
    createdAt: string;
}

export interface AreaAdminDto {
    id: string;
    nameAr: string;
    nameEn: string;
    cityId: string;
    cityNameAr: string;
    isActive: boolean;
    sortOrder: number;
    userCount: number;
    createdAt: string;
}

export interface PagedResult<T> {
    items: T[];
    pageNumber: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
}

export interface CreateGovernorateRequest {
    nameAr: string;
    nameEn: string;
    sortOrder: number;
}

export interface CreateCityRequest {
    nameAr: string;
    nameEn: string;
    governorateId: string;
    sortOrder: number;
}

export interface CreateAreaRequest {
    nameAr: string;
    nameEn: string;
    cityId: string;
    sortOrder: number;
}

export interface UpdateLocationRequest {
    nameAr?: string;
    nameEn?: string;
    sortOrder?: number;
}

@Injectable({
    providedIn: 'root'
})
export class LocationService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/locations`;
    private readonly adminUrl = `${environment.apiUrl}/admin/locations`;

    // ── In-memory cache for dropdown data ──
    private governoratesCache$?: Observable<GovernorateDto[]>;
    private citiesByGovernorate = new Map<string, Observable<CityDto[]>>();
    private areasByCity = new Map<string, Observable<AreaDto[]>>();

    // ─────────────────────────────────────────────
    //  Public (dropdown) — with shareReplay caching
    // ─────────────────────────────────────────────

    getGovernorates(): Observable<GovernorateDto[]> {
        if (!this.governoratesCache$) {
            this.governoratesCache$ = this.http.get<GovernorateDto[]>(
                `${this.apiUrl}/governorates`
            ).pipe(shareReplay(1));
        }
        return this.governoratesCache$;
    }

    getCities(governorateId: string): Observable<CityDto[]> {
        if (!governorateId) return of([]);

        const cached = this.citiesByGovernorate.get(governorateId);
        if (cached) return cached;

        const req$ = this.http.get<CityDto[]>(
            `${this.apiUrl}/cities`, { params: { governorateId } }
        ).pipe(shareReplay(1));

        this.citiesByGovernorate.set(governorateId, req$);
        return req$;
    }

    getAreas(cityId: string): Observable<AreaDto[]> {
        if (!cityId) return of([]);

        const cached = this.areasByCity.get(cityId);
        if (cached) return cached;

        const req$ = this.http.get<AreaDto[]>(
            `${this.apiUrl}/areas`, { params: { cityId } }
        ).pipe(shareReplay(1));

        this.areasByCity.set(cityId, req$);
        return req$;
    }

    /** Force refresh governorate cache (e.g. after admin creates one) */
    invalidateGovernorates(): void {
        this.governoratesCache$ = undefined;
    }

    /** Force refresh city cache for a governorate */
    invalidateCities(governorateId: string): void {
        this.citiesByGovernorate.delete(governorateId);
    }

    /** Force refresh area cache for a city */
    invalidateAreas(cityId: string): void {
        this.areasByCity.delete(cityId);
    }

    // ─────────────────────────────────────────────
    //  Admin: Governorates
    // ─────────────────────────────────────────────

    getGovernoratesPaged(page = 1, pageSize = 20, search?: string, isActive?: boolean): Observable<PagedResult<GovernorateAdminDto>> {
        const params: Record<string, string> = { page: page.toString(), pageSize: pageSize.toString() };
        if (search) params['search'] = search;
        if (isActive !== undefined) params['isActive'] = isActive.toString();
        return this.http.get<PagedResult<GovernorateAdminDto>>(`${this.adminUrl}/governorates`, { params });
    }

    createGovernorate(request: CreateGovernorateRequest): Observable<GovernorateAdminDto> {
        return this.http.post<GovernorateAdminDto>(`${this.adminUrl}/governorate`, request).pipe(
            tap(() => this.invalidateGovernorates())
        );
    }

    updateGovernorate(id: string, request: UpdateLocationRequest): Observable<GovernorateAdminDto> {
        return this.http.put<GovernorateAdminDto>(`${this.adminUrl}/governorate/${id}`, request).pipe(
            tap(() => this.invalidateGovernorates())
        );
    }

    activateGovernorate(id: string): Observable<void> {
        return this.http.put<void>(`${this.adminUrl}/governorate/${id}/activate`, {}).pipe(
            tap(() => this.invalidateGovernorates())
        );
    }

    deactivateGovernorate(id: string): Observable<void> {
        return this.http.put<void>(`${this.adminUrl}/governorate/${id}/deactivate`, {}).pipe(
            tap(() => this.invalidateGovernorates())
        );
    }

    // ─────────────────────────────────────────────
    //  Admin: Cities
    // ─────────────────────────────────────────────

    getCitiesPaged(page = 1, pageSize = 20, governorateId?: string, search?: string, isActive?: boolean): Observable<PagedResult<CityAdminDto>> {
        const params: Record<string, string> = { page: page.toString(), pageSize: pageSize.toString() };
        if (governorateId) params['governorateId'] = governorateId;
        if (search) params['search'] = search;
        if (isActive !== undefined) params['isActive'] = isActive.toString();
        return this.http.get<PagedResult<CityAdminDto>>(`${this.adminUrl}/cities`, { params });
    }

    createCity(request: CreateCityRequest): Observable<CityAdminDto> {
        return this.http.post<CityAdminDto>(`${this.adminUrl}/city`, request).pipe(
            tap(() => this.invalidateCities(request.governorateId))
        );
    }

    updateCity(id: string, request: UpdateLocationRequest): Observable<CityAdminDto> {
        return this.http.put<CityAdminDto>(`${this.adminUrl}/city/${id}`, request);
    }

    activateCity(id: string, governorateId: string): Observable<void> {
        return this.http.put<void>(`${this.adminUrl}/city/${id}/activate`, {}).pipe(
            tap(() => this.invalidateCities(governorateId))
        );
    }

    deactivateCity(id: string, governorateId: string): Observable<void> {
        return this.http.put<void>(`${this.adminUrl}/city/${id}/deactivate`, {}).pipe(
            tap(() => this.invalidateCities(governorateId))
        );
    }

    // ─────────────────────────────────────────────
    //  Admin: Areas
    // ─────────────────────────────────────────────

    getAreasPaged(page = 1, pageSize = 20, cityId?: string, search?: string, isActive?: boolean): Observable<PagedResult<AreaAdminDto>> {
        const params: Record<string, string> = { page: page.toString(), pageSize: pageSize.toString() };
        if (cityId) params['cityId'] = cityId;
        if (search) params['search'] = search;
        if (isActive !== undefined) params['isActive'] = isActive.toString();
        return this.http.get<PagedResult<AreaAdminDto>>(`${this.adminUrl}/areas`, { params });
    }

    createArea(request: CreateAreaRequest): Observable<AreaAdminDto> {
        return this.http.post<AreaAdminDto>(`${this.adminUrl}/area`, request).pipe(
            tap(() => this.invalidateAreas(request.cityId))
        );
    }

    updateArea(id: string, request: UpdateLocationRequest): Observable<AreaAdminDto> {
        return this.http.put<AreaAdminDto>(`${this.adminUrl}/area/${id}`, request);
    }

    activateArea(id: string, cityId: string): Observable<void> {
        return this.http.put<void>(`${this.adminUrl}/area/${id}/activate`, {}).pipe(
            tap(() => this.invalidateAreas(cityId))
        );
    }

    deactivateArea(id: string, cityId: string): Observable<void> {
        return this.http.put<void>(`${this.adminUrl}/area/${id}/deactivate`, {}).pipe(
            tap(() => this.invalidateAreas(cityId))
        );
    }
}
