import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { User, UserRole, UserStatus, AuthResponse, LoginRequest, TokenPayload } from '../models/user.model';

// Mock users database
const MOCK_USERS: User[] = [
    {
        id: '1',
        displayId: 'ADM-1001',
        name: 'عبد الله أحمد',
        email: 'admin@test.com',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        avatar: 'https://i.pravatar.cc/150?img=1',
        phone: '+966500000001',
        governorate: 'القاهرة',
        city: 'المعادي',
        neighborhood: 'الحي التاسع',
        nationalId: '29501010101234',
        age: 35,
        createdAt: new Date('2024-01-01')
    },
    {
        id: '2',
        displayId: 'REF-2005',
        name: 'محمد علي',
        email: 'referee@test.com',
        role: UserRole.REFEREE,
        status: UserStatus.ACTIVE,
        avatar: 'https://i.pravatar.cc/150?img=2',
        phone: '+966500000002',
        governorate: 'الجيزة',
        city: 'الدقي',
        neighborhood: 'ميدان المساحة',
        nationalId: '28805150105678',
        age: 38,
        createdAt: new Date('2024-01-15')
    },
    {
        id: '3',
        displayId: 'PLR-5082',
        name: 'أحمد المحمد',
        email: 'player@test.com',
        role: UserRole.CAPTAIN, // This user is a captain because they own team 'team1'
        status: UserStatus.ACTIVE,
        avatar: 'https://i.pravatar.cc/150?img=3',
        phone: '+966500000003',
        governorate: 'القاهرة',
        city: 'القاهرة الجديدة',
        neighborhood: 'التجمع الخامس',
        nationalId: '29003120109012',
        age: 32,
        teamId: 'team1',
        createdAt: new Date('2024-02-01')
    },
    {
        id: '4',
        displayId: 'PLR-6001',
        name: 'سالم عبدالله',
        email: 'player2@test.com',
        role: UserRole.PLAYER, // Regular player, no team
        status: UserStatus.ACTIVE,
        avatar: 'https://i.pravatar.cc/150?img=4',
        phone: '+966500000004',
        governorate: 'القاهرة',
        city: 'المعادي',
        neighborhood: 'زهراء المعادي',
        nationalId: '29105150109999',
        age: 25,
        createdAt: new Date('2024-02-10')
    }
];


@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly TOKEN_KEY = 'ramadan_auth_token';
    private readonly USER_KEY = 'ramadan_user';

    constructor() { }

    /**
     * Mock registration - generates temporary user data
     * Registration ALWAYS creates a PLAYER (for non-referee registrations)
     */
    register(userData: any): Observable<User> {
        return of(null).pipe(
            delay(1500),
            map(() => {
                // Determine role: Referee stays Referee, others become Player
                const isReferee = userData.role === UserRole.REFEREE;
                const newUser: User = {
                    id: `user-${Date.now()}`,
                    displayId: isReferee ? `REF-${Math.floor(1000 + Math.random() * 9000)}` : `PLR-${Math.floor(1000 + Math.random() * 9000)}`,
                    name: userData.fullName,
                    email: userData.email,
                    role: isReferee ? UserRole.REFEREE : UserRole.PLAYER,
                    status: UserStatus.PENDING,
                    phone: userData.phone,
                    age: userData.age,
                    nationalId: userData.nationalId,
                    governorate: userData.governorate,
                    city: userData.city,
                    neighborhood: userData.neighborhood,
                    createdAt: new Date()
                };

                // Store in localStorage so PendingApprovalComponent can see it
                localStorage.setItem(this.USER_KEY, JSON.stringify(newUser));

                return newUser;
            })
        );
    }

    /**
     * Refresh the current user from localStorage (useful after role changes)
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


    login(request: LoginRequest): Observable<AuthResponse> {
        return of(null).pipe(
            delay(800), // Simulate network delay
            map(() => {
                // Find user by email
                const user = MOCK_USERS.find(u => u.email === request.email);

                if (!user || request.password !== 'password') {
                    throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
                }

                // Generate mock JWT token
                const token = this.generateMockJWT(user);

                // Store in localStorage
                localStorage.setItem(this.TOKEN_KEY, token);
                localStorage.setItem(this.USER_KEY, JSON.stringify(user));

                return { token, user };
            })
        );
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
            const expiration = payload.exp * 1000; // Convert to milliseconds
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
    hasRole(role: UserRole): boolean {
        const user = this.getCurrentUser();
        return user?.role === role;
    }

    /**
     * Check if current user has any of the specified roles
     */
    hasAnyRole(roles: UserRole[]): boolean {
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
     * Generate mock JWT token
     */
    private generateMockJWT(user: User): string {
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(unescape(encodeURIComponent(JSON.stringify({
            sub: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
        }))));
        const signature = btoa('mock-signature');

        return `${header}.${payload}.${signature}`;
    }

    /**
     * Decode JWT token
     */
    private decodeToken(token: string): TokenPayload {
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid token');
        }

        const payload = parts[1];
        return JSON.parse(decodeURIComponent(escape(atob(payload)))) as TokenPayload;
    }
}
