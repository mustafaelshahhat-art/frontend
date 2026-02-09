import { Component, OnInit, inject, ChangeDetectionStrategy, computed, ViewChild, TemplateRef, AfterViewInit, OnDestroy } from '@angular/core';
import { AdminLayoutService } from '../../../../core/services/admin-layout.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { UserRole } from '../../../../core/models/user.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { NotificationService } from '../../../../core/services/notification.service';
import { NotificationStore } from '../../../../core/stores/notification.store';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago.pipe';
import { Notification as AppNotification } from '../../../../core/models/tournament.model';

interface Notification {
    id: string;
    title: string;
    message: string;
    createdAt: Date;
    type: string;
    isRead: boolean;
    icon?: string;
    link?: string;
}

import { CardComponent } from '../../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { InlineLoadingComponent } from '../../../../shared/components/inline-loading/inline-loading.component';

@Component({
    selector: 'app-notifications',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        EmptyStateComponent,
        PageHeaderComponent,
        CardComponent,
        ButtonComponent,
        BadgeComponent,
        InlineLoadingComponent,
        TimeAgoPipe
    ],
    templateUrl: './notifications.component.html',
    styleUrls: ['./notifications.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationsComponent implements OnInit, AfterViewInit, OnDestroy {
    private authService = inject(AuthService);
    private notificationService = inject(NotificationService);
    private notificationStore = inject(NotificationStore);
    private router = inject(Router);
    private readonly adminLayout = inject(AdminLayoutService);

    currentUser = this.authService.getCurrentUser();
    userRole = this.currentUser?.role || UserRole.PLAYER;

    isLoading = this.notificationStore.isLoading;

    notificationsView = computed(() => {
        return this.notificationStore.notifications().map((n: AppNotification) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            createdAt: new Date(n.createdAt),
            type: n.type,
            isRead: n.isRead,
            icon: this.getIcon(n.type)
        }));
    });

    get notifications(): Notification[] {
        return this.notificationsView();
    }

    @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<any>;

    ngOnInit(): void {
        this.adminLayout.setTitle(this.pageTitle);
        this.adminLayout.setSubtitle(this.pageSubtitle);
        this.notificationService.loadNotifications();
    }

    ngAfterViewInit(): void {
        // Defer to avoid ExpressionChangedAfterItHasCheckedError
        setTimeout(() => {
            this.adminLayout.setActions(this.actionsTemplate);
        });
    }

    ngOnDestroy(): void {
        this.adminLayout.reset();
    }

    get pageTitle(): string {
        return this.isAdmin() ? 'التنبيهات' : 'مركز التنبيهات';
    }

    get pageSubtitle(): string {
        const subtitles: Partial<Record<UserRole, string>> = {
            [UserRole.ADMIN]: 'إدارة جميع تنبيهات النظام والمستجدات',
            [UserRole.REFEREE]: 'ابق على اطلاع بآخر التحديثات والمواعيد الخاصة بك',
            [UserRole.PLAYER]: 'تابع آخر أخبار فريقك ونتائج البطولة لحظة بلحظة'
        };
        return subtitles[this.userRole] || '';
    }

    markAllAsRead(): void {
        this.notificationService.markAllAsRead().subscribe();
    }

    markAsRead(notification: Notification): void {
        this.notificationService.markAsRead(notification.id).subscribe();

        if (notification.link) {
            this.router.navigateByUrl(notification.link);
        }
    }

    getIcon(type: string): string {
        const icons: Record<string, string> = {
            'match': 'sports_soccer',
            'tournament': 'emoji_events',
            'objection': 'gavel',
            'message': 'mail',
            'team': 'groups',
            'system': 'settings',
            'payment': 'payments'
        };
        return icons[type] || 'notifications';
    }

    getColor(type: string): string {
        const colors: Record<string, string> = {
            'match': '#3B82F6',
            'tournament': '#10B981',
            'objection': '#EF4444',
            'message': '#3B82F6',
            'team': '#8B5CF6',
            'system': '#64748b',
            'payment': '#F59E0B'
        };
        return colors[type] || '#64748b';
    }

    isAdmin(): boolean {
        return this.userRole === UserRole.ADMIN;
    }

    get unreadCount(): number {
        return this.notifications.filter(n => !n.isRead).length;
    }

    trackByNotification(index: number, item: Notification): string {
        return item.id;
    }
}
