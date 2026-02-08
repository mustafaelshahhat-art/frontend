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
        if (!dateInput) return 'غير متاح';

        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return 'غير متاح';

        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'الآن';
        if (diffInSeconds < 3600) return `منذ ${Math.floor(diffInSeconds / 60)} دقيقة`;
        if (diffInSeconds < 86400) return `منذ ${Math.floor(diffInSeconds / 3600)} ساعة`;
        if (diffInSeconds < 2592000) return `منذ ${Math.floor(diffInSeconds / 86400)} يوم`;

        return date.toLocaleDateString('ar-EG');
    }
}
