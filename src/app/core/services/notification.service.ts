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

    get notifications(): Observable<Notification[]> {
        return this.notifications$.asObservable();
    }

    get unreadCount(): Observable<number> {
        return this.unreadCount$.asObservable();
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
        const connection = this.signalRService.createConnection('notifications');

        connection.on('ReceiveNotification', (notification: Notification) => {
            const current = this.notifications$.value;
            this.notifications$.next([notification, ...current]);
            this.unreadCount$.next(this.unreadCount$.value + 1);
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
