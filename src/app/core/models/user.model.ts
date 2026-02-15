export enum UserRole {
    ADMIN = 'Admin',
    PLAYER = 'Player',
    TOURNAMENT_CREATOR = 'TournamentCreator',
    GUEST = 'Guest'
}

export enum TeamRole {
    CAPTAIN = 'Captain',
    MEMBER = 'Member'
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
    teamId?: string; // ID of the team the user belongs to
    teamName?: string;
    teamRole?: TeamRole;
    joinedTeamIds?: string[]; // IDs of all teams the user belongs to
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
    governorate?: string | null;
    city?: string | null;
    neighborhood?: string | null;
    role: string | number;
    idFront?: File | null;
    idBack?: File | null;
    fullName?: string | null; // Legacy field support
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

