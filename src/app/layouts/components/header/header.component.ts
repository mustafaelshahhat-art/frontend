import { Component, Input, Output, EventEmitter, HostListener, ElementRef, inject, ChangeDetectionStrategy } from '@angular/core';

import { SearchComponent } from '../../../shared/components/search/search.component';
import { NotificationsDropdownComponent } from '../notifications-dropdown/notifications-dropdown.component';
import { Notification } from '../../../core/models/tournament.model';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [SearchComponent, NotificationsDropdownComponent],
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {
    private elementRef = inject(ElementRef);

    @Input() isMobile = false;
    @Input() windowSize = window.innerWidth;
    @Input() title = '';
    @Input() unreadCount = 0;
    @Input() notifications: Notification[] = [];

    @Output() toggleSidebar = new EventEmitter<void>();
    @Output() viewNotification = new EventEmitter<Notification>();
    @Output() viewAllNotifications = new EventEmitter<void>();

    showNotifications = false;

    @HostListener('document:click', ['$event'])
    onClick(event: MouseEvent) {
        if (!this.showNotifications) return;

        const wrapper = this.elementRef.nativeElement.querySelector('.notifications-wrapper');
        if (wrapper && !wrapper.contains(event.target)) {
            this.showNotifications = false;
        }
    }

    handleToggleSidebar() {
        this.toggleSidebar.emit();
    }

    toggleNotifications() {
        this.showNotifications = !this.showNotifications;
    }

    handleViewNotification(notification: Notification) {
        this.viewNotification.emit(notification);
        this.showNotifications = false;
    }

    handleViewAllNotifications() {
        this.viewAllNotifications.emit();
        this.showNotifications = false;
    }
}
