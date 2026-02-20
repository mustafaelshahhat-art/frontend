import { User, UserRole, UserStatus, TeamRole } from '../../../../core/models/user.model';

export function getBadgeType(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
    switch (status) {
        case UserStatus.ACTIVE: return 'success';
        case UserStatus.PENDING: return 'warning';
        case UserStatus.SUSPENDED: return 'danger';
        default: return 'neutral';
    }
}

export function getStatusLabel(status: string): string {
    switch (status) {
        case UserStatus.ACTIVE: return 'نشط';
        case UserStatus.PENDING: return 'معلق';
        case UserStatus.SUSPENDED: return 'موقوف';
        default: return 'غير معروف';
    }
}

export function getRoleLabel(user: User): string {
    if (user.role === UserRole.PLAYER && user.teamRole === TeamRole.CAPTAIN) {
        return 'قائد فريق';
    }
    switch (user.role) {
        case UserRole.ADMIN: return 'مسؤول';
        case UserRole.TOURNAMENT_CREATOR: return 'منشئ بطولة';
        default: return 'لاعب';
    }
}
