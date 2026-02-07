import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { LOCATIONS_DATA } from '../../shared/data/locations.data';

@Injectable({
    providedIn: 'root'
})
export class LocationService {
    private governorates$?: Observable<string[]>;
    private citiesByGovernorate = new Map<string, Observable<string[]>>();
    private districtsByCity = new Map<string, Observable<string[]>>();

    getGovernorates(): Observable<string[]> {
        if (!this.governorates$) {
            this.governorates$ = of(LOCATIONS_DATA.map(g => g.name)).pipe(shareReplay(1));
        }
        return this.governorates$;
    }

    getCities(governorateId: string): Observable<string[]> {
        const key = governorateId || '';
        const cached = this.citiesByGovernorate.get(key);
        if (cached) return cached;

        const gov = LOCATIONS_DATA.find(g => g.name === governorateId);
        const req$ = of((gov?.cities || []).map(c => c.name)).pipe(shareReplay(1));
        this.citiesByGovernorate.set(key, req$);
        return req$;
    }

    getDistricts(cityId: string): Observable<string[]> {
        const key = cityId || '';
        const cached = this.districtsByCity.get(key);
        if (cached) return cached;

        const city = LOCATIONS_DATA.flatMap(g => g.cities).find(c => c.name === cityId);
        const req$ = of(city?.neighborhoods || []).pipe(shareReplay(1));
        this.districtsByCity.set(key, req$);
        return req$;
    }
}
