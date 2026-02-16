import { Injectable, signal, computed } from '@angular/core';
import { Notification } from '../models/tournament.model';

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationStore {
  private state = signal<NotificationState>({
    notifications: [],
    unreadCount: 0,
    totalCount: 0,
    currentPage: 1,
    pageSize: 20,
    totalPages: 0,
    isLoading: false,
    error: null
  });

  // ── Selectors ──
  readonly notifications = computed(() => this.state().notifications);
  readonly unreadCount = computed(() => this.state().unreadCount);
  readonly totalCount = computed(() => this.state().totalCount);
  readonly currentPage = computed(() => this.state().currentPage);
  readonly pageSize = computed(() => this.state().pageSize);
  readonly totalPages = computed(() => this.state().totalPages);
  readonly isLoading = computed(() => this.state().isLoading);
  readonly error = computed(() => this.state().error);
  readonly hasNextPage = computed(() => this.state().currentPage < this.state().totalPages);
  readonly hasPreviousPage = computed(() => this.state().currentPage > 1);
  readonly isEmpty = computed(() => !this.state().isLoading && this.state().notifications.length === 0);

  // ── Mutations ──

  setLoading(loading: boolean): void {
    this.state.update(s => ({ ...s, isLoading: loading }));
  }

  setError(error: string | null): void {
    this.state.update(s => ({ ...s, error, isLoading: false }));
  }

  /** Replace the entire notification list (from a paged API response) */
  setPage(notifications: Notification[], totalCount: number, page: number, pageSize: number): void {
    this.state.update(s => ({
      ...s,
      notifications,
      totalCount,
      currentPage: page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
      isLoading: false,
      error: null
    }));
  }

  /** Set unread count from dedicated API endpoint */
  setUnreadCount(count: number): void {
    this.state.update(s => ({ ...s, unreadCount: count }));
  }

  /** Prepend a new real-time notification (deduped) */
  addNotification(notification: Notification): void {
    this.state.update(s => {
      // Dedup: skip if already exists
      if (s.notifications.some(n => n.id === notification.id)) return s;
      return {
        ...s,
        notifications: [notification, ...s.notifications],
        totalCount: s.totalCount + 1,
        unreadCount: s.unreadCount + 1
      };
    });
  }

  markAsRead(notificationId: string): void {
    this.state.update(s => ({
      ...s,
      notifications: s.notifications.map(n =>
        n.id === notificationId ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, s.unreadCount - (s.notifications.find(n => n.id === notificationId && !n.isRead) ? 1 : 0))
    }));
  }

  markAllAsRead(): void {
    this.state.update(s => ({
      ...s,
      notifications: s.notifications.map(n => ({ ...n, isRead: true })),
      unreadCount: 0
    }));
  }

  removeNotification(notificationId: string): void {
    this.state.update(s => {
      const removed = s.notifications.find(n => n.id === notificationId);
      return {
        ...s,
        notifications: s.notifications.filter(n => n.id !== notificationId),
        totalCount: Math.max(0, s.totalCount - 1),
        unreadCount: removed && !removed.isRead ? Math.max(0, s.unreadCount - 1) : s.unreadCount
      };
    });
  }

  reset(): void {
    this.state.set({
      notifications: [],
      unreadCount: 0,
      totalCount: 0,
      currentPage: 1,
      pageSize: 20,
      totalPages: 0,
      isLoading: false,
      error: null
    });
  }

  // ── Utility ──
  getNotificationById(id: string): Notification | undefined {
    return this.notifications().find(n => n.id === id);
  }
}