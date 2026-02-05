import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { User, AuthResponse, LoginRequest, TokenPayload } from '../models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly TOKEN_KEY = 'auth_token';
    private readonly REFRESH_TOKEN_KEY = 'refresh_token';
    private readonly USER_KEY = 'current_user';
    private userSubject = new BehaviorSubject<User | null>(this.getCurrentUser());
    public user$ = this.userSubject.asObservable();

    private readonly apiUrl = `${environment.apiUrl}/auth`;

    constructor() { }

    register(userData: any): Observable<AuthResponse> {
        const formData = new FormData();
        formData.append('email', userData.email);
        formData.append('password', userData.password);
        formData.append('name', userData.fullName || userData.name);
        formData.append('phone', userData.phone || '');
        if (userData.age) formData.append('age', userData.age.toString());
        formData.append('nationalId', userData.nationalId || '');
        formData.append('governorate', userData.governorate || '');
        formData.append('city', userData.city || '');
        formData.append('neighborhood', userData.neighborhood || '');
        formData.append('role', this.mapRoleToBackend(userData.role).toString());

        if (userData.idFront) formData.append('idFront', userData.idFront);
        if (userData.idBack) formData.append('idBack', userData.idBack);

        return this.http.post<AuthResponse>(`${this.apiUrl}/register`, formData).pipe(
            tap(response => this.handleAuthResponse(response))
        );
    }

    private mapRoleToBackend(role: string | number): number {
        // Backend UserRole: Player = 0, Captain = 1, Referee = 2, Admin = 3
        if (typeof role === 'number') return role;

        const r = role?.toLowerCase();
        if (r === 'admin') return 3;
        if (r === 'referee') return 2;
        if (r === 'captain') return 1;
        return 0; // Default to Player
    }

    login(request: LoginRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/login`, request).pipe(
            tap(response => this.handleAuthResponse(response))
        );
    }

    refreshToken(): Observable<AuthResponse> {
        const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
        if (!refreshToken) return throwError(() => new Error('No refresh token'));

        return this.http.post<AuthResponse>(`${this.apiUrl}/refresh-token`, { refreshToken }).pipe(
            tap(response => this.handleAuthResponse(response))
        );
    }

    logout(): void {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.REFRESH_TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        this.userSubject.next(null);
    }

    isAuthenticated(): boolean {
        const token = localStorage.getItem(this.TOKEN_KEY);
        if (!token) return false;

        try {
            const payload = this.decodeToken(token);
            const expiration = payload.exp * 1000;
            return Date.now() < expiration;
        } catch {
            return false;
        }
    }

    getCurrentUser(): User | null {
        const userJson = localStorage.getItem(this.USER_KEY);
        if (!userJson) return null;

        try {
            return JSON.parse(userJson);
        } catch {
            return null;
        }
    }

    hasRole(role: string): boolean {
        const user = this.getCurrentUser();
        if (role === 'Captain' && user?.role === 'Player' && user?.teamId) {
            return true;
        }
        return user?.role === role;
    }

    hasAnyRole(roles: string[]): boolean {
        const user = this.getCurrentUser();
        return user ? roles.includes(user.role) : false;
    }

    getToken(): string | null {
        return localStorage.getItem(this.TOKEN_KEY);
    }

    private handleAuthResponse(response: AuthResponse): void {
        localStorage.setItem(this.TOKEN_KEY, response.token);
        if (response.refreshToken) {
            localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refreshToken);
        }
        localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
        this.userSubject.next(response.user);
    }

    updateCurrentUser(updatedUser: User): void {
        localStorage.setItem(this.USER_KEY, JSON.stringify(updatedUser));
        this.userSubject.next(updatedUser);
    }

    private decodeToken(token: string): TokenPayload {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                throw new Error('Invalid token format');
            }
            const payload = parts[1];
            return JSON.parse(atob(payload)) as TokenPayload;
        } catch (e) {
            throw new Error('Could not decode token');
        }
    }
}

