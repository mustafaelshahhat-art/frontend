import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private readonly http = inject(HttpClient);
    // TODO: Define actual API base URL
    private readonly apiUrl = 'api/users';

    getUsers(): Observable<User[]> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    getUserById(id: string): Observable<User> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    updateUser(id: string, updates: Partial<User>): Observable<User> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    deleteUser(id: string): Observable<boolean> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    suspendUser(id: string): Observable<boolean> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }
}
