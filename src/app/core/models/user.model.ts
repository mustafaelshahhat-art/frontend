// ──────────────────────────────────────────────────────────
// User domain models — aligned with backend UserDto / AuthDtos
// ──────────────────────────────────────────────────────────

export enum UserRole {
    ADMIN = 'Admin',
    PLAYER = 'Player',
    TOURNAMENT_CREATOR = 'TournamentCreator',
    GUEST = 'Guest'            // Frontend-only role for unauthenticated users
}

export enum TeamRole {
    CAPTAIN = 'Captain',
    MEMBER = 'Member'
}

export enum UserStatus {
    ACTIVE = 'Active',
    PENDING = 'Pending',
    SUSPENDED = 'Suspended'
}

export interface User {
    id: string;
    displayId: string;
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    phone?: string;
    age?: number;
    nationalId?: string;
    governorateId?: string;
    cityId?: string;
    areaId?: string;
    governorateNameAr?: string;  // Backend: GovernorateNameAr
    cityNameAr?: string;         // Backend: CityNameAr
    areaNameAr?: string;         // Backend: AreaNameAr
    idFrontUrl?: string;
    idBackUrl?: string;
    teamId?: string;
    teamName?: string;
    teamRole?: TeamRole;
    joinedTeamIds?: string[];
    isEmailVerified: boolean;
    createdAt: Date;
    activities?: Activity[];
}

export interface Activity {
    id: string;
    type: string;
    message: string;
    createdAt: Date;
}

export interface AuthResponse {
    token: string;
    refreshToken?: string;
    user: User;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
    phone?: string | null;
    age?: number | null;
    nationalId?: string | null;
    governorateId?: string | null;
    cityId?: string | null;
    areaId?: string | null;
    role: string | number;
    idFront?: File | null;
    idBack?: File | null;
    fullName?: string | null;
}

/**
 * JWT Token Payload interface for type-safe token decoding
 */
export interface TokenPayload {
    sub: string;
    email: string;
    role: UserRole;
    name: string;
    iat: number;
    exp: number;
}

