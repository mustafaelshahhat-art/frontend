import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { User, AuthResponse, LoginRequest, TokenPayload } from '../models/user.model';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly TOKEN_KEY = 'ramadan_auth_token';
    private readonly USER_KEY = 'ramadan_user';

    // TODO: Define actual API base URL in environment files
    private apiUrl = 'api/auth';

    constructor() { }

    /**
     * Register new user
     * TODO: Implement backend registration endpoint
     */
    register(userData: any): Observable<User> {
        // Example: return this.http.post<User>(`${this.apiUrl}/register`, userData);
        return throwError(() => new Error('Registration endpoint not yet implemented'));
    }

    /**
     * Refresh the current user data
     */
    refreshCurrentUser(): User | null {
        return this.getCurrentUser();
    }

    /**
     * Update current user's data in localStorage
     */
    updateCurrentUser(updatedUser: User): void {
        localStorage.setItem(this.USER_KEY, JSON.stringify(updatedUser));
    }

    /**
     * Login user
     * TODO: Implement backend login endpoint
     */
    login(request: LoginRequest): Observable<AuthResponse> {
        // Example: return this.http.post<AuthResponse>(`${this.apiUrl}/login`, request);
        return throwError(() => new Error('Login endpoint not yet implemented'));
    }

    /**
     * Logout - clear stored data
     */
    logout(): void {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
    }

    /**
     * Check if user is authenticated
     */
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

    /**
     * Get current logged-in user
     */
    getCurrentUser(): User | null {
        const userJson = localStorage.getItem(this.USER_KEY);
        if (!userJson) return null;

        try {
            return JSON.parse(userJson);
        } catch {
            return null;
        }
    }

    /**
     * Check if current user has specified role
     */
    hasRole(role: string): boolean {
        const user = this.getCurrentUser();
        return user?.role === role;
    }

    /**
     * Check if current user has any of the specified roles
     */
    hasAnyRole(roles: string[]): boolean {
        const user = this.getCurrentUser();
        return user ? roles.includes(user.role) : false;
    }

    /**
     * Get stored JWT token
     */
    getToken(): string | null {
        return localStorage.getItem(this.TOKEN_KEY);
    }

    /**
     * Decode JWT token
     */
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

