import { Injectable, inject, effect } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, catchError, throwError } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';

import { Notification } from '../models/tournament.model';
import { PagedResult } from '../models/pagination.model';
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
    private readonly store = inject(NotificationStore);
    private readonly realTimeUpdate = inject(RealTimeUpdateService);
    private readonly apiUrl = `${environment.apiUrl}/notifications`;

    private joinRequestUpdate$ = new BehaviorSubject<void>(undefined);
    private removedFromTeam$ = new BehaviorSubject<void>(undefined);
    private listenersBound = false;
    private currentSubscribedRole: string | null = null;

    private isConnected = toSignal(this.signalRService.isConnected$, { initialValue: false });

    // ── Expose store signals ──
    readonly notifications = this.store.notifications;
    readonly unreadCount = this.store.unreadCount;
    readonly isLoading = this.store.isLoading;
    readonly totalPages = this.store.totalPages;
    readonly currentPage = this.store.currentPage;
    readonly hasNextPage = this.store.hasNextPage;
    readonly hasPreviousPage = this.store.hasPreviousPage;
    readonly isEmpty = this.store.isEmpty;

    get joinRequestUpdate(): Observable<void> {
        return this.joinRequestUpdate$.asObservable();
    }

    get removedFromTeamAndRefresh(): Observable<void> {
        return this.removedFromTeam$.asObservable();
    }

    constructor() {
        // Sync role subscription when user changes + connection is ready
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

        // Connect hub + load data when user authenticates
        effect(() => {
            const user = this.authStore.currentUser();
            if (user) {
                this.loadNotifications();
                this.loadUnreadCount();
                this.connectHub();
            } else {
                this.disconnect();
            }
        });
    }

    // ── Data Loading ──

    loadNotifications(page = 1): void {
        this.store.setLoading(true);

        const params = new HttpParams()
            .set('page', page)
            .set('pageSize', this.store.pageSize());

        this.http.get<PagedResult<Notification>>(this.apiUrl, { params }).subscribe({
            next: (paged) => {
                this.store.setPage(paged.items, paged.totalCount, paged.pageNumber, paged.pageSize);
            },
            error: () => {
                this.store.setError('فشل تحميل الإشعارات');
            }
        });
    }

    loadUnreadCount(): void {
        this.http.get<{ count: number }>(`${this.apiUrl}/unread-count`).subscribe({
            next: (res) => this.store.setUnreadCount(res.count),
            error: () => { /* silent — badge just stays stale */ }
        });
    }

    loadPage(page: number): void {
        this.loadNotifications(page);
    }

    // ── Actions ──

    markAsRead(id: string): Observable<void> {
        this.store.markAsRead(id);

        return this.http.post<void>(`${this.apiUrl}/${id}/read`, {}).pipe(
            catchError((error: unknown) => {
                // Revert
                const notification = this.store.getNotificationById(id);
                if (notification) {
                    this.store.addNotification({ ...notification, isRead: false });
                }
                this.loadUnreadCount();
                return throwError(() => error);
            })
        );
    }

    markAllAsRead(): Observable<void> {
        const prevCount = this.store.unreadCount();
        this.store.markAllAsRead();

        return this.http.post<void>(`${this.apiUrl}/read-all`, {}).pipe(
            catchError((error: unknown) => {
                this.store.setUnreadCount(prevCount);
                this.loadNotifications();
                return throwError(() => error);
            })
        );
    }

    deleteNotification(id: string): Observable<void> {
        this.store.removeNotification(id);

        return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
            catchError((error: unknown) => {
                this.loadNotifications();
                return throwError(() => error);
            })
        );
    }

    // ── SignalR ──

    private async connectHub(): Promise<void> {
        this.realTimeUpdate.ensureInitialized();
        const connection = this.signalRService.createConnection('notifications');

        if (!this.listenersBound) {
            connection.on('ReceiveNotification', (notification: Notification) => {
                this.store.addNotification(notification);

                // Category-based side effects (replaces old regex matching)
                if (notification.category === 'team') {
                    const isRemoval = /إزالة|حذف|طرد|استبعاد/.test(notification.title);
                    if (isRemoval) {
                        this.removedFromTeam$.next();
                    } else {
                        this.joinRequestUpdate$.next();
                    }
                }
            });

            this.listenersBound = true;
        }

        await this.signalRService.startConnection('notifications');
    }

    private disconnect(): void {
        this.store.reset();
    }

    private async syncRoleSubscription(role: string): Promise<void> {
        if (this.currentSubscribedRole === role) return;

        try {
            await this.subscribeToRole(role);
            this.currentSubscribedRole = role;
        } catch (err: unknown) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-restricted-syntax
            const error = err as any;
            if (error.message?.includes('Unauthorized')) {
                console.warn(`Transient role subscription failure for ${role}.`);
            } else {
                console.error(`Failed to subscribe to role ${role}:`, err);
            }
        }
    }

    // ── Group Management ──

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
