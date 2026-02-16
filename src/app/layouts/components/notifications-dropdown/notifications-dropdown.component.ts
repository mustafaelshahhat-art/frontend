import { IconComponent } from '../../../shared/components/icon/icon.component';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';
import { Notification, NotificationCategory, NotificationType } from '../../../core/models/tournament.model';

@Component({
    selector: 'app-notifications-dropdown',
    standalone: true,
    imports: [IconComponent, TimeAgoPipe],
    templateUrl: './notifications-dropdown.component.html',
    styleUrls: ['./notifications-dropdown.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationsDropdownComponent {
    @Input() notifications: Notification[] = [];
    @Input() unreadCount = 0;
    @Input() isMobile = false;
    @Input() isOpen = false;

    @Output() dropdownClosed = new EventEmitter<void>();
    @Output() viewNotification = new EventEmitter<Notification>();
    @Output() viewAll = new EventEmitter<void>();

    handleViewNotification(notification: Notification) {
        this.viewNotification.emit(notification);
        this.dropdownClosed.emit();
    }

    handleViewAll() {
        this.viewAll.emit();
        this.dropdownClosed.emit();
    }

    getCategoryIcon(category: NotificationCategory): string {
        const icons: Record<NotificationCategory, string> = {
            system: 'settings',
            account: 'person',
            payments: 'payments',
            tournament: 'emoji_events',
            match: 'sports_soccer',
            team: 'groups',
            administrative: 'admin_panel_settings',
            security: 'security'
        };
        return icons[category] || 'notifications';
    }

    getTypeClass(type: NotificationType): string {
        const classes: Record<NotificationType, string> = {
            info: 'notification-icon-info',
            success: 'notification-icon-success',
            warning: 'notification-icon-warning',
            error: 'notification-icon-error'
        };
        return classes[type] || 'notification-icon-info';
    }
}
