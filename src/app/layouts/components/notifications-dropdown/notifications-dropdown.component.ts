import { IconComponent } from '../../../shared/components/icon/icon.component';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';
import { Notification } from '../../../core/models/tournament.model';

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

    getTypeIcon(type: string): string {
        switch (type) {
            case 'match': return 'sports_soccer';
            case 'tournament': return 'emoji_events';
            case 'objection': return 'gavel';
            case 'payment': return 'payments';
            case 'team': return 'groups';
            case 'message': return 'mail';
            case 'system': return 'settings';
            case 'info': return 'info';
            case 'warning': return 'warning';
            case 'error': return 'error';
            case 'success': return 'check_circle';
            default: return 'notifications';
        }
    }
}
