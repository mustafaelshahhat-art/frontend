import { Injectable, signal, computed } from '@angular/core';
import { Notification } from '../models/tournament.model';

export interface NotificationState {
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationStore {
  private state = signal<NotificationState>({
    notifications: [],
    isLoading: false,
    error: null
  });

  // Selectors
  notifications = computed(() => this.state().notifications);
  unreadCount = computed(() => this.notifications().filter(n => !n.isRead).length);
  isLoading = computed(() => this.state().isLoading);
  error = computed(() => this.state().error);

  // Mutations
  setLoading(loading: boolean): void {
    this.state.update(state => ({ ...state, isLoading: loading }));
  }

  setError(error: string | null): void {
    this.state.update(state => ({ ...state, error }));
  }

  setNotifications(notifications: Notification[]): void {
    this.state.update(state => ({ 
      ...state, 
      notifications, 
      isLoading: false, 
      error: null 
    }));
  }

  addNotification(notification: Notification): void {
    this.state.update(state => ({
      ...state,
      notifications: [notification, ...state.notifications]
    }));
  }

  markAsRead(notificationId: string): void {
    this.state.update(state => ({
      ...state,
      notifications: state.notifications.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    }));
  }

  markAllAsRead(): void {
    this.state.update(state => ({
      ...state,
      notifications: state.notifications.map(n => ({ ...n, isRead: true }))
    }));
  }

  removeNotification(notificationId: string): void {
    this.state.update(state => ({
      ...state,
      notifications: state.notifications.filter(n => n.id !== notificationId)
    }));
  }

  // Utility methods
  getUnreadNotifications(): Notification[] {
    return this.notifications().filter(n => !n.isRead);
  }

  getNotificationById(id: string): Notification | undefined {
    return this.notifications().find(n => n.id === id);
  }
}