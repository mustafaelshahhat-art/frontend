import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-notifications-dropdown',
    standalone: true,
    imports: [CommonModule],
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
            case 'info': return 'info';
            case 'warning': return 'warning';
            case 'error': return 'error';
            case 'success': return 'check_circle';
            default: return 'notifications';
        }
    }

    formatTimeAgo(dateInput: Date | string): string {
        const date = new Date(dateInput);
        const diff = Date.now() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 60) return `منذ ${minutes} دقيقة`;
        const hours = Math.floor(minutes / 60);
        return `منذ ${hours} ساعة`;
    }
}
