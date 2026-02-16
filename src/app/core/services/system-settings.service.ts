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
    private readonly adminUrl = `${environment.apiUrl}/admin/SystemSettings`;
    private readonly publicUrl = `${environment.apiUrl}/Status`;

    /**
     * Gets the system settings from the server (Admin only).
     */
    getSettings(): Observable<SystemSettings> {
        return this.http.get<SystemSettings>(this.adminUrl);
    }

    /**
     * Updates the system settings (Admin only).
     */
    updateSettings(settings: SystemSettings): Observable<SystemSettings> {
        return this.http.post<SystemSettings>(this.adminUrl, settings);
    }

    /**
     * Public endpoint — no auth required.
     * Safe to call from login/landing pages.
     */
    getMaintenanceStatus(): Observable<{ maintenanceMode: boolean }> {
        return this.http.get<{ maintenanceMode: boolean }>(
            `${this.publicUrl}/maintenance`,
            { headers: { 'X-Skip-Error-Handler': 'true' } }
        );
    }

    /**
     * Admin-only maintenance status with full context (includes updatedAt).
     */
    getAdminMaintenanceStatus(): Observable<{ maintenanceMode: boolean; updatedAt: string }> {
        return this.http.get<{ maintenanceMode: boolean; updatedAt: string }>(
            `${this.adminUrl}/maintenance-status`
        );
    }
}
