import { Component, Input, Output, EventEmitter, HostListener, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchComponent } from '../../../shared/components/search/search.component';
import { NotificationsDropdownComponent } from '../notifications-dropdown/notifications-dropdown.component';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [CommonModule, SearchComponent, NotificationsDropdownComponent],
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
    private elementRef = inject(ElementRef);

    @Input() isMobile: boolean = false;
    @Input() windowSize: number = window.innerWidth;
    @Input() title: string = '';
    @Input() unreadCount: number = 0;
    @Input() notifications: any[] = [];

    @Output() toggleSidebar = new EventEmitter<void>();
    @Output() viewNotification = new EventEmitter<any>();
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

    handleViewNotification(notification: any) {
        this.viewNotification.emit(notification);
        this.showNotifications = false;
    }

    handleViewAllNotifications() {
        this.viewAllNotifications.emit();
        this.showNotifications = false;
    }
}
