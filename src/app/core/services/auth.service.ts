import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError, BehaviorSubject, of } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { User, AuthResponse, LoginRequest, TokenPayload, UserStatus } from '../models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);
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
        // Backend UserRole: Player = 0, Referee = 1, Admin = 2
        if (typeof role === 'number') return role;

        const r = role?.toLowerCase();
        if (r === 'admin') return 2;
        if (r === 'referee') return 1;
        return 0; // Default to Player (Captain role removed)
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
        return user?.role === role;
    }

    /**
     * Determines if the current user is the owner (Captain) of the given team.
     * CAPTAIN = a PLAYER who OWNS a team (user.Id == team.CaptainId)
     */
    isTeamOwner(team: any): boolean {
        const user = this.getCurrentUser();
        if (!user || !team) return false;
        return team.captainId === user.id;
    }

    /**
     * Determines if the current user can register a team in a tournament.
     * ONLY the team owner (PLAYER) can register the team.
     */
    canRegisterTournament(team: any): boolean {
        return this.isTeamOwner(team);
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

    /**
     * Clears the user's team association. Used when user is removed from a team.
     * Updates both local storage and reactive state immediately.
     */
    clearTeamAssociation(): void {
        const user = this.getCurrentUser();
        if (!user) return;

        const updatedUser = { ...user, teamId: undefined, isTeamOwner: false };
        this.updateCurrentUser(updatedUser);
    }

    /**
     * Updates the user status and handles immediate logout if account is disabled.
     */
    updateUserStatus(newStatus: string): void {
        const user = this.getCurrentUser();
        if (!user) return;

        const updatedUser = { ...user, status: newStatus as UserStatus };
        this.updateCurrentUser(updatedUser);

        const disabledStatuses = ['Suspended', 'Banned', 'Disabled', 'Deleted'];
        if (disabledStatuses.includes(newStatus)) {
            console.warn(`Account status changed to ${newStatus}. Logging out...`);
            this.logout();
            this.router.navigate(['/auth/login'], {
                queryParams: { message: 'account_disabled' }
            });
        }
    }

    /**
     * Fetches the latest user profile from the backend and updates the local state.
     * This allows status updates (e.g., Pending -> Active) without logout/login.
     */
    refreshUserProfile(): Observable<User | null> {
        const user = this.getCurrentUser();
        if (!user) return of(null);

        const profileUrl = `${environment.apiUrl}/users/${user.id}`;
        return this.http.get<User>(profileUrl).pipe(
            tap(updatedUser => {
                if (updatedUser) {
                    this.updateCurrentUser(updatedUser);
                }
            }),
            catchError(err => {
                console.error('Error refreshing user profile:', err);
                return of(user);
            })
        );
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

