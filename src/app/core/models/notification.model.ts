// ──────────────────────────────────────────────────────────
// Notification domain models — aligned with backend NotificationDto
// ──────────────────────────────────────────────────────────

export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationCategory = 'system' | 'account' | 'payments' | 'tournament' | 'match' | 'team' | 'administrative' | 'security';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    category: NotificationCategory;
    priority: NotificationPriority;
    isRead: boolean;
    createdAt: Date;
    entityId?: string;
    entityType?: string;
    actionUrl?: string;
}
