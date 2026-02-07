import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class LocationService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/locations`;

    getGovernorates(): Observable<string[]> {
        return this.http.get<string[]>(`${this.apiUrl}/governorates`);
    }

    getCities(governorateId: string): Observable<string[]> {
        return this.http.get<string[]>(`${this.apiUrl}/cities?governorateId=${governorateId}`);
    }

    getDistricts(cityId: string): Observable<string[]> {
        return this.http.get<string[]>(`${this.apiUrl}/districts?cityId=${cityId}`);
    }
}
