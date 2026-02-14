import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { User } from '../models/user.model';
import { PagedResult } from '../models/pagination.model';
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

    getUsers(pageNumber = 1, pageSize = 20): Observable<PagedResult<User>> {
        const params = new HttpParams()
            .set('pageNumber', pageNumber.toString())
            .set('pageSize', pageSize.toString());

        return this.http.get<PagedResult<User>>(this.apiUrl, { params });
    }

    getUsersByRole(role: string, pageNumber = 1, pageSize = 20): Observable<PagedResult<User>> {
        const params = new HttpParams()
            .set('pageNumber', pageNumber.toString())
            .set('pageSize', pageSize.toString());

        return this.http.get<PagedResult<User>>(`${this.apiUrl}/role/${role}`, { params });
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
     * Creates a new tournament creator user. Only callable by existing admins.
     */
    createTournamentCreator(request: CreateAdminRequest): Observable<User> {
        return this.http.post<User>(`${this.apiUrl}/create-tournament-creator`, request);
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



    /**
     * Uploads a user's avatar image
     */
    uploadAvatar(file: File): Observable<{ avatarUrl: string }> {
        return new Observable(observer => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64Image = reader.result as string;
                const request = {
                    base64Image: base64Image,
                    fileName: file.name
                };
                this.http.post<{ avatarUrl: string }>(`${this.apiUrl}/upload-avatar`, request)
                    .subscribe({
                        next: (response) => observer.next(response),
                        error: (error) => observer.error(error),
                        complete: () => observer.complete()
                    });
            };
            reader.readAsDataURL(file);
        });
    }
}

