import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';

@Component({
    selector: 'app-notifications-dropdown',
    standalone: true,
    imports: [CommonModule, TimeAgoPipe],
    templateUrl: './notifications-dropdown.component.html',
    styleUrls: ['./notifications-dropdown.component.scss']
})
export class NotificationsDropdownComponent {
    @Input() notifications: any[] = [];
    @Input() unreadCount: number = 0;
    @Input() isMobile: boolean = false;
    @Input() isOpen: boolean = false;

    @Output() close = new EventEmitter<void>();
    @Output() viewNotification = new EventEmitter<any>();
    @Output() viewAll = new EventEmitter<void>();

    handleViewNotification(notification: any) {
        this.viewNotification.emit(notification);
        this.close.emit();
    }

    handleViewAll() {
        this.viewAll.emit();
        this.close.emit();
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
