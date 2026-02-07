import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SystemSettings {
    allowTeamCreation: boolean;
    maintenanceMode: boolean;
    updatedAt?: string;
}

@Injectable({
    providedIn: 'root'
})
export class SystemSettingsService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/admin/SystemSettings`;

    /**
     * Gets the system settings from the server.
     */
    getSettings(): Observable<SystemSettings> {
        return this.http.get<SystemSettings>(this.apiUrl);
    }

    /**
     * Updates the system settings.
     */
    updateSettings(settings: SystemSettings): Observable<SystemSettings> {
        return this.http.post<SystemSettings>(this.apiUrl, settings);
    }

    /**
     * Public method to check maintenance status.
     */
    getMaintenanceStatus(): Observable<{ maintenanceMode: boolean }> {
        return this.http.get<{ maintenanceMode: boolean }>(`${this.apiUrl}/maintenance-status`);
    }
}
