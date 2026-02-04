import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchComponent } from '../search/search.component';
import { NotificationsDropdownComponent } from '../notifications-dropdown/notifications-dropdown.component';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [CommonModule, SearchComponent, NotificationsDropdownComponent],
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
    @Input() isMobile: boolean = false;
    @Input() windowSize: number = window.innerWidth;
    @Input() title: string = '';
    @Input() unreadCount: number = 0;
    @Input() notifications: any[] = [];

    @Output() toggleSidebar = new EventEmitter<void>();
    @Output() viewNotification = new EventEmitter<any>();
    @Output() viewAllNotifications = new EventEmitter<void>();

    showNotifications = false;

    handleToggleSidebar() {
        this.toggleSidebar.emit();
    }

    toggleNotifications() {
        this.showNotifications = !this.showNotifications;
    }

    handleViewNotification(notification: any) {
        this.viewNotification.emit(notification);
        this.showNotifications = false;
    }

    handleViewAllNotifications() {
        this.viewAllNotifications.emit();
        this.showNotifications = false;
    }
}
