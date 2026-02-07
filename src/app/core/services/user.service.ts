import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError, map } from 'rxjs';
import { User } from '../models/user.model';
import { environment } from '../../../environments/environment';

export interface CreateAdminRequest {
    name: string;
    email: string;
    password: string;
    status: 'Active' | 'Suspended';
}

export interface AdminCountDto {
    totalAdmins: number;
    isLastAdmin: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/Users`;

    getUsers(): Observable<User[]> {
        return this.http.get<User[]>(this.apiUrl);
    }

    getUsersByRole(role: string): Observable<User[]> {
        return this.http.get<User[]>(`${this.apiUrl}/role/${role}`);
    }

    getUserById(id: string): Observable<User> {
        return this.http.get<User>(`${this.apiUrl}/${id}`);
    }

    updateUser(id: string, updates: Partial<User>): Observable<User> {
        return this.http.patch<User>(`${this.apiUrl}/${id}`, updates);
    }

    deleteUser(id: string): Observable<boolean> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
            map(() => true)
        );
    }

    suspendUser(id: string): Observable<boolean> {
        return this.http.post<void>(`${this.apiUrl}/${id}/suspend`, {}).pipe(
            map(() => true)
        );
    }

    activateUser(id: string): Observable<boolean> {
        return this.http.post<void>(`${this.apiUrl}/${id}/activate`, {}).pipe(
            map(() => true)
        );
    }

    /**
     * Creates a new admin user. Only callable by existing admins.
     */
    createAdmin(request: CreateAdminRequest): Observable<User> {
        return this.http.post<User>(`${this.apiUrl}/create-admin`, request);
    }

    /**
     * Gets the count of active admins. Used for safety checks.
     */
    getAdminCount(userId?: string): Observable<AdminCountDto> {
        let params = new HttpParams();
        if (userId) {
            params = params.set('userId', userId);
        }
        return this.http.get<AdminCountDto>(`${this.apiUrl}/admin-count`, { params });
    }
}

