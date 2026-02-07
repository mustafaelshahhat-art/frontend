import { Component, OnInit, inject, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { UserRole } from '../../../../core/models/user.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { NotificationService } from '../../../../core/services/notification.service';
import { Notification as AppNotification } from '../../../../core/models/tournament.model';

interface Notification {
    id: string;
    title: string;
    message: string;
    time: string;
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
        InlineLoadingComponent
    ],
    templateUrl: './notifications.component.html',
    styleUrls: ['./notifications.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationsComponent implements OnInit {
    private authService = inject(AuthService);
    private notificationService = inject(NotificationService);
    private cdr = inject(ChangeDetectorRef);
    private router = inject(Router);

    currentUser = this.authService.getCurrentUser();
    userRole = this.currentUser?.role || UserRole.PLAYER;

    isLoading = true;
    notifications: Notification[] = []; // Component interface matches enough if I'm careful

    ngOnInit(): void {
        this.loadNotifications();
    }

    loadNotifications(): void {
        this.isLoading = true;
        this.notificationService.notifications.subscribe((notifications: AppNotification[]) => {
            this.notifications = notifications.map((n: AppNotification) => ({
                id: n.id,
                title: n.title,
                message: n.message,
                time: this.formatTime(new Date(n.createdAt)),
                type: n.type,
                isRead: n.isRead,
                icon: this.getIcon(n.type)
            }));
            this.isLoading = false;
            this.cdr.detectChanges();
        });

        // Ensure they are loaded from API
        this.notificationService.loadNotifications();
    }

    private formatTime(date: Date): string {
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'الآن';
        if (diffInSeconds < 3600) return `منذ ${Math.floor(diffInSeconds / 60)} دقيقة`;
        if (diffInSeconds < 86400) return `منذ ${Math.floor(diffInSeconds / 3600)} ساعة`;
        return date.toLocaleDateString('ar-EG');
    }

    get pageTitle(): string {
        return this.isAdmin() ? 'الإشعارات' : 'مركز التنبيهات';
    }

    get pageSubtitle(): string {
        const subtitles: Partial<Record<UserRole, string>> = {
            [UserRole.ADMIN]: 'إدارة تنبيهات النظام والمستخدمين',
            [UserRole.REFEREE]: 'تابع آخر التعديلات والتعيينات الخاصة بمبارياتك',
            [UserRole.PLAYER]: 'ابقَ على اطلاع بأحدث مجريات البطولة وقرارات اللجنة'
        };
        return subtitles[this.userRole] || '';
    }

    markAllAsRead(): void {
        this.notificationService.markAllAsRead().subscribe();
    }

    markAsRead(notification: Notification): void {
        this.notificationService.markAsRead(notification.id).subscribe();

        // Navigate if link exists
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
