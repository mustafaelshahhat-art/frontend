import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, map } from 'rxjs';
import { User } from '../models/user.model';
import { environment } from '../../../environments/environment';

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
}
