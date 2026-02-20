import { Match } from '../../../../core/models/tournament.model';
import { User, UserRole } from '../../../../core/models/user.model';

export enum ChatParticipantRole {
    CAPTAIN = 'captain',
    PLAYER = 'player',
    ADMIN = 'admin'
}

export interface ChatMessage {
    id: string;
    text: string;
    senderName: string;
    senderId: string;
    senderRole: string;
    timestamp: Date;
    isSystem?: boolean;
}

export interface ChatParticipant {
    id: string;
    name: string;
    avatarInitial: string;
    role: ChatParticipantRole;
    teamId?: string;
    isOnline: boolean;
}

export function formatTime(date: Date): string {
    return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'اليوم';
    if (days === 1) return 'أمس';
    if (days < 7) return `منذ ${days} أيام`;
    return date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
}

export function getRoleLabel(role: ChatParticipantRole): string {
    switch (role) {
        case ChatParticipantRole.ADMIN: return 'مشرف';
        case ChatParticipantRole.CAPTAIN: return 'قائد';
        case ChatParticipantRole.PLAYER: return 'لاعب';
        default: return '';
    }
}

export function getRoleBadgeClass(role: ChatParticipantRole): string {
    switch (role) {
        case ChatParticipantRole.ADMIN: return 'badge-danger';
        case ChatParticipantRole.CAPTAIN: return 'badge-gold';
        case ChatParticipantRole.PLAYER: return 'badge-primary';
        default: return 'badge-muted';
    }
}

export function translateRole(role?: string): string {
    if (!role) return 'player';
    const r = role.toLowerCase();
    if (r === 'admin') return 'admin';
    if (r === 'tournamentcreator') return 'organizer';
    if (r === 'captain') return 'captain';
    return 'player';
}

export function formatScheduledDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

export function getMinDate(): string {
    return new Date().toISOString().split('T')[0];
}

export function buildParticipants(match: Match): ChatParticipant[] {
    return [
        { id: 'system-admin', name: 'الـمشرف الأساسي', avatarInitial: 'م', role: ChatParticipantRole.ADMIN, isOnline: true },
        { id: match.tournamentCreatorId || 'organizer', name: 'مـنظم البطولة', avatarInitial: 'ن', role: ChatParticipantRole.ADMIN, isOnline: true },
        { id: match.homeTeamId + '-cap', name: `قائد ${match.homeTeamName}`, avatarInitial: 'ق', role: ChatParticipantRole.CAPTAIN, teamId: match.homeTeamId, isOnline: true },
        { id: match.awayTeamId + '-cap', name: `قائد ${match.awayTeamName}`, avatarInitial: 'ق', role: ChatParticipantRole.CAPTAIN, teamId: match.awayTeamId, isOnline: true },
    ];
}

export function checkMatchAuthorization(currentUser: User | null, match: Match | null): boolean {
    if (!currentUser || !match) return false;
    if (currentUser.role === UserRole.ADMIN) return true;

    const isHomePlayer = currentUser.teamId === match.homeTeamId || (currentUser.joinedTeamIds?.includes(match.homeTeamId));
    const isAwayPlayer = currentUser.teamId === match.awayTeamId || (currentUser.joinedTeamIds?.includes(match.awayTeamId));
    const isCreator = currentUser.id === match.tournamentCreatorId;

    return !!(isHomePlayer || isAwayPlayer || isCreator);
}
