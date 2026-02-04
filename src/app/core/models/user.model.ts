export enum UserRole {
    ADMIN = 'ADMIN',
    REFEREE = 'REFEREE',
    CAPTAIN = 'CAPTAIN',
    PLAYER = 'PLAYER'
}

export enum UserStatus {
    ACTIVE = 'active',
    PENDING = 'pending',
    SUSPENDED = 'suspended'
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
    createdAt: Date;
}


export interface AuthResponse {
    token: string;
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

