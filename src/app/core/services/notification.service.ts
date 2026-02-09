import { Injectable, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, catchError, throwError } from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';


import { Notification } from '../models/tournament.model';
import { SignalRService } from './signalr.service';
import { AuthService } from './auth.service';
import { AuthStore } from '../stores/auth.store';
import { NotificationStore } from '../stores/notification.store';
import { RealTimeUpdateService } from './real-time-update.service';

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private readonly http = inject(HttpClient);
    private readonly signalRService = inject(SignalRService);
    private readonly authService = inject(AuthService);
    private readonly authStore = inject(AuthStore);
    private readonly notificationStore = inject(NotificationStore);
    private readonly realTimeUpdate = inject(RealTimeUpdateService);
    private readonly apiUrl = `${environment.apiUrl}/notifications`;

    private joinRequestUpdate$ = new BehaviorSubject<void>(undefined);
    private listenersBound = false;
    private currentSubscribedRole: string | null = null;

    private isConnected = toSignal(this.signalRService.isConnected$, { initialValue: false });

    // Expose store signals as observables for backward compatibility
    get notifications(): Observable<Notification[]> {
        return toObservable(this.notificationStore.notifications);
    }

    get unreadCount(): Observable<number> {
        return toObservable(this.notificationStore.unreadCount);
    }

    get joinRequestUpdate(): Observable<void> {
        return this.joinRequestUpdate$.asObservable();
    }

    private removedFromTeam$ = new BehaviorSubject<void>(undefined);
    get removedFromTeamAndRefresh(): Observable<void> {
        return this.removedFromTeam$.asObservable();
    }


    constructor() {
        // Reactive subscription management
        effect(() => {
            const user = this.authStore.currentUser();
            const connected = this.isConnected();

            if (user && connected) {
                this.syncRoleSubscription(user.role);
            } else if (!user) {
                this.currentSubscribedRole = null;
                this.disconnect();
            }
        });

        // Effect for starting/stopping connection
        effect(() => {
            const user = this.authStore.currentUser();
            if (user) {
                this.loadNotifications(); // Reload on user change
                this.connectHub();
            } else {
                this.disconnect();
            }
        });
    }

    private async syncRoleSubscription(role: string): Promise<void> {
        if (this.currentSubscribedRole === role) return;

        // If we were subscribed to another role, we could unsubscribe here
        // but SignalR clean-up on stopAllConnections usually handles this.

        try {
            await this.subscribeToRole(role);
            this.currentSubscribedRole = role;
            console.warn(`Successfully subscribed to role: ${role}`);
        } catch (err: unknown) {
            // Handle expected rejection / timing issue
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-restricted-syntax
            const error = err as any;
            if (error.message && error.message.includes('Unauthorized')) {
                console.warn(`Transient role subscription failure for ${role}. Will be retried on next auth sync.`);
            } else {
                console.error(`Failed to subscribe to role ${role}:`, err);
            }
        }
    }

    private async connectHub(): Promise<void> {
        this.realTimeUpdate.ensureInitialized();
        const connection = this.signalRService.createConnection('notifications');
        if (!this.listenersBound) {
            connection.on('ReceiveNotification', (notification: Notification) => {
                this.notificationStore.addNotification(notification);

                if (notification.type === 'invite' || notification.type === 'join_request' ||
                    notification.type === 'invite_accepted' || notification.type === 'invite_rejected' ||
                    notification.type === 'join_accepted' || notification.type === 'join_rejected') {
                    this.joinRequestUpdate$.next();
                }
            });

            this.listenersBound = true;
        }

        await this.signalRService.startConnection('notifications');
    }

    private disconnect(): void {
        this.notificationStore.setNotifications([]);
    }

    loadNotifications(): void {
        this.notificationStore.setLoading(true);
        this.http.get<Notification[]>(this.apiUrl).subscribe({
            next: (notifications) => {
                this.notificationStore.setNotifications(notifications);
            },
            error: (error) => {
                this.notificationStore.setError('Failed to load notifications');
                this.notificationStore.setLoading(false);
                console.error('Error loading notifications:', error);
            }
        });
    }

    markAsRead(id: string): Observable<void> {
        // Optimistic update - update store immediately
        this.notificationStore.markAsRead(id);

        // Send to backend for persistence
        return this.http.post<void>(`${this.apiUrl}/${id}/read`, {}).pipe(
            catchError((error: unknown) => {
                console.error('Error marking notification as read:', error);
                // Revert optimistic update on error
                const notification = this.notificationStore.getNotificationById(id);
                if (notification) {
                    this.notificationStore.addNotification({ ...notification, isRead: false });
                }
                return throwError(() => error);
            })
        );
    }

    markAllAsRead(): Observable<void> {
        // Optimistic update - update store immediately
        const unreadNotifications = this.notificationStore.getUnreadNotifications();
        this.notificationStore.markAllAsRead();

        // Send to backend for persistence
        return this.http.post<void>(`${this.apiUrl}/read-all`, {}).pipe(
            catchError((error: unknown) => {
                console.error('Error marking all notifications as read:', error);
                // Revert optimistic update on error
                unreadNotifications.forEach(n => {
                    this.notificationStore.addNotification({ ...n, isRead: false });
                });
                return throwError(() => error);
            })
        );
    }

    // ========================================
    // Group Management
    // ========================================

    async subscribeToRole(role: string): Promise<void> {
        const connection = this.signalRService.createConnection('notifications');
        if (connection.state === 'Connected') {
            await connection.invoke('SubscribeToRole', role);
        }
    }

    async subscribeToTournament(tournamentId: string): Promise<void> {
        const connection = this.signalRService.createConnection('notifications');
        if (connection.state === 'Connected') {
            await connection.invoke('SubscribeToTournament', tournamentId);
        }
    }

    async subscribeToMatch(matchId: string): Promise<void> {
        const connection = this.signalRService.createConnection('notifications');
        if (connection.state === 'Connected') {
            await connection.invoke('SubscribeToMatch', matchId);
        }
    }
}
