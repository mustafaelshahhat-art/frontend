import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/models/user.model';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';

interface Notification {
    id: number;
    title: string;
    message: string;
    time: string;
    type: string;
    isRead: boolean;
    icon?: string;
}

import { CardComponent } from '../../components/card/card.component';
import { ButtonComponent } from '../../components/button/button.component';
import { BadgeComponent } from '../../components/badge/badge.component';

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
        BadgeComponent
    ],
    templateUrl: './notifications.component.html',
    styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit {
    private authService = inject(AuthService);
    private cdr = inject(ChangeDetectorRef);

    currentUser = this.authService.getCurrentUser();
    userRole = this.currentUser?.role || UserRole.CAPTAIN;

    isLoading = true;
    notifications: Notification[] = [];

    // Admin: notification form
    newNotification = {
        title: '',
        message: ''
    };

    ngOnInit(): void {
        this.loadNotifications();
    }

    loadNotifications(): void {
        this.isLoading = true;

        // Simulated load with role-specific notifications
        setTimeout(() => {
            this.notifications = this.getRoleNotifications();
            this.isLoading = false;
            this.cdr.detectChanges();
        }, 300);
    }

    private getRoleNotifications(): Notification[] {
        const baseNotifications: Record<UserRole, Notification[]> = {
            [UserRole.ADMIN]: [
                { id: 1, title: 'موعد المباراة', message: 'تذكير بموعد مباراة الصقور غداً في العاشرة مساءً', time: 'منذ ١٠ دقائق', type: 'match', isRead: false, icon: 'schedule' },
                { id: 2, title: 'تأكيد التسجيل', message: 'تم قبول تسجيل فريق النجوم في البطولة', time: 'منذ ساعتين', type: 'tournament', isRead: true, icon: 'check_circle' },
                { id: 3, title: 'تحديث النتائج', message: 'تم تحديث نتائج الجولة الثالثة', time: 'أمس', type: 'system', isRead: true, icon: 'scoreboard' }
            ],
            [UserRole.CAPTAIN]: [
                { id: 1, title: 'موعد مباراة قادمة', message: 'مباراتك القادمة ضد فريق الاتحاد يوم الخميس الساعة 9:00 مساءً.', time: 'منذ ساعتين', type: 'match', isRead: false },
                { id: 2, title: 'تم قبول الاعتراض', message: 'تم قبول اعتراضك على نتيجة مباراة الأهلي وتعديل النتيجة رسمياً.', time: 'منذ 5 ساعات', type: 'objection', isRead: true },
                { id: 3, title: 'فتح باب التسجيل', message: 'تم فتح باب التسجيل في بطولة رمضان الكبرى. بادر بالتسجيل الآن!', time: 'يوم أمس', type: 'tournament', isRead: true }
            ],
            [UserRole.REFEREE]: [
                { id: 1, title: 'مباراة قادمة', message: 'تم تعيينك حكماً لمباراة النجوم والصقور غداً في تمام الساعة 8:00 مساءً.', time: 'منذ ساعة', type: 'match', isRead: false },
                { id: 2, title: 'تحديث اللوائح', message: 'تم تحديث لوائح البطولة الرمضانية، يرجى مراجعتها من لوحة التحكم.', time: 'منذ 3 ساعات', type: 'tournament', isRead: true },
                { id: 3, title: 'رسالة جديدة', message: 'تلقيت رسالة جديدة من لجنة الحكام بخصوص مباراة أمس.', time: 'يوم أمس', type: 'message', isRead: true }
            ],
            [UserRole.PLAYER]: [
                { id: 1, title: 'موعد مباراة', message: 'مباراة فريقك القادمة يوم الخميس الساعة 9:00 مساءً.', time: 'منذ ساعتين', type: 'match', isRead: false },
                { id: 2, title: 'تحديث التشكيلة', message: 'تم تحديث تشكيلة الفريق للمباراة القادمة.', time: 'منذ 5 ساعات', type: 'team', isRead: true }
            ]
        };
        return baseNotifications[this.userRole] || [];
    }

    get pageTitle(): string {
        return this.isAdmin() ? 'الإشعارات' : 'مركز التنبيهات';
    }

    get pageSubtitle(): string {
        const subtitles: Record<UserRole, string> = {
            [UserRole.ADMIN]: 'إرسال وتنبيهات النظام للمستخدمين',
            [UserRole.CAPTAIN]: 'ابقَ على اطلاع بأحدث مجريات البطولة وقرارات اللجنة',
            [UserRole.REFEREE]: 'تابع آخر التعديلات والتعيينات الخاصة بمبارياتك',
            [UserRole.PLAYER]: 'تابع آخر أخبار فريقك'
        };
        return subtitles[this.userRole] || '';
    }

    markAllAsRead(): void {
        this.notifications.forEach(n => n.isRead = true);
        this.cdr.detectChanges();
    }

    markAsRead(notification: Notification): void {
        notification.isRead = true;
        this.cdr.detectChanges();
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

    sendNotification(): void {
        if (this.newNotification.title && this.newNotification.message) {
            // Admin: send notification
            const notification: Notification = {
                id: Date.now(),
                title: this.newNotification.title,
                message: this.newNotification.message,
                time: 'الآن',
                type: 'system',
                isRead: true,
                icon: 'send'
            };
            this.notifications.unshift(notification);
            this.newNotification = { title: '', message: '' };
            this.cdr.detectChanges();
        }
    }

    isAdmin(): boolean {
        return this.userRole === UserRole.ADMIN;
    }

    get unreadCount(): number {
        return this.notifications.filter(n => !n.isRead).length;
    }
}
