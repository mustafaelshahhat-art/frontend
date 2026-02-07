import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Notification } from '../models/tournament.model';
import { SignalRService } from './signalr.service';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private readonly http = inject(HttpClient);
    private readonly signalRService = inject(SignalRService);
    private readonly authService = inject(AuthService);
    private readonly apiUrl = `${environment.apiUrl}/notifications`;

    private notifications$ = new BehaviorSubject<Notification[]>([]);
    private unreadCount$ = new BehaviorSubject<number>(0);
    private joinRequestUpdate$ = new BehaviorSubject<void>(undefined);

    get notifications(): Observable<Notification[]> {
        return this.notifications$.asObservable();
    }

    get unreadCount(): Observable<number> {
        return this.unreadCount$.asObservable();
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
        // Prevent duplicate connections and listeners
        if (this.signalRService.isConnected('notifications')) {
            return;
        }

        const connection = this.signalRService.createConnection('notifications');

        // Ensure clean state for listeners
        connection.off('ReceiveNotification');
        connection.off('AccountStatusChanged');
        connection.off('RemovedFromTeam');
        connection.off('TeamDeleted');

        connection.on('ReceiveNotification', (notification: Notification) => {
            const current = this.notifications$.value;
            this.notifications$.next([notification, ...current]);
            this.unreadCount$.next(this.unreadCount$.value + 1);

            if (notification.type === 'invite' || notification.type === 'join_request' ||
                notification.type === 'invite_accepted' || notification.type === 'invite_rejected' ||
                notification.type === 'join_accepted' || notification.type === 'join_rejected') {
                this.joinRequestUpdate$.next();
            }
        });

        connection.on('AccountStatusChanged', (data: { userId: string, status: string }) => {
            this.authService.updateUserStatus(data.status);
        });

        // Handle real-time team removal notification
        connection.on('RemovedFromTeam', (data: { playerId: string, teamId: string }) => {
            // Clear team association immediately
            this.authService.clearTeamAssociation();
        });

        // Handle real-time team deletion notification
        connection.on('TeamDeleted', (data: { teamId: string }) => {
            // Clear team association immediately for all members
            this.authService.clearTeamAssociation();
        });

        await this.signalRService.startConnection('notifications');
    }

    private disconnect(): void {
        this.signalRService.stopConnection('notifications');
        this.notifications$.next([]);
        this.unreadCount$.next(0);
    }

    loadNotifications(): void {
        this.http.get<Notification[]>(this.apiUrl).subscribe(notifications => {
            this.notifications$.next(notifications);
            this.unreadCount$.next(notifications.filter(n => !n.isRead).length);
        });
    }

    markAsRead(id: string): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/${id}/read`, {}).pipe(
            map(() => {
                const current = this.notifications$.value;
                const index = current.findIndex(n => n.id === id);
                if (index !== -1 && !current[index].isRead) {
                    current[index].isRead = true;
                    this.notifications$.next([...current]);
                    this.unreadCount$.next(Math.max(0, this.unreadCount$.value - 1));
                }
            })
        );
    }

    markAllAsRead(): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/read-all`, {}).pipe(
            map(() => {
                const current = this.notifications$.value.map(n => ({ ...n, isRead: true }));
                this.notifications$.next(current);
                this.unreadCount$.next(0);
            })
        );
    }
}
