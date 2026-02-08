import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, catchError, throwError } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';
import { Notification } from '../models/tournament.model';
import { SignalRService } from './signalr.service';
import { AuthService } from './auth.service';
import { NotificationStore } from '../stores/notification.store';
import { RealTimeUpdateService } from './real-time-update.service';

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private readonly http = inject(HttpClient);
    private readonly signalRService = inject(SignalRService);
    private readonly authService = inject(AuthService);
    private readonly notificationStore = inject(NotificationStore);
    private readonly realTimeUpdate = inject(RealTimeUpdateService);
    private readonly apiUrl = `${environment.apiUrl}/notifications`;

    private joinRequestUpdate$ = new BehaviorSubject<void>(undefined);
    private listenersBound = false;

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

    constructor() {
        this.authService.user$.subscribe(user => {
            if (user) {
                this.init();
            } else {
                this.disconnect();
            }
        });
    }

    private init(): void {
        this.loadNotifications();
        this.connectHub();
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

            connection.on('AccountStatusChanged', (data: any) => {
                const status = data?.status ?? data?.Status;
                if (status) {
                    this.authService.updateUserStatus(status);
                }
            });

            connection.on('RemovedFromTeam', (data: any) => {
                const playerId = data?.playerId ?? data?.PlayerId;
                const currentUser = this.authService.getCurrentUser();
                if (!currentUser || !playerId || currentUser.id === playerId) {
                    this.authService.clearTeamAssociation();
                }
            });

            this.listenersBound = true;
        }

        await this.signalRService.startConnection('notifications');

        // Join Role Group
        const user = this.authService.getCurrentUser();
        if (user && user.role) {
            this.subscribeToRole(user.role);
        }
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
            catchError((error: any) => {
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
            catchError((error: any) => {
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
