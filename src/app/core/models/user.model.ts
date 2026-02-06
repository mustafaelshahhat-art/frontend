export enum UserRole {
    ADMIN = 'Admin',
    REFEREE = 'Referee',
    PLAYER = 'Player'
}

export enum UserStatus {
    ACTIVE = 'Active',
    PENDING = 'Pending',
    SUSPENDED = 'Suspended',
    BANNED = 'Banned',
    DISABLED = 'Disabled'
}

export interface User {
    id: string;
    displayId: string; // Visible ID for the user
    name: string;
    username?: string;
    email: string;
    role: UserRole;
    avatar?: string;
    status: UserStatus;
    phone?: string;
    age?: number;
    nationalId?: string;
    governorate?: string;
    city?: string;
    neighborhood?: string;
    idFrontUrl?: string;
    idBackUrl?: string;
    teamId?: string; // ID of the team the user belongs to (as player or captain)
    teamName?: string;
    isTeamOwner: boolean;
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

