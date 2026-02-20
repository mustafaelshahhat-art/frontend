import { IconComponent } from '../../../shared/components/icon/icon.component';
import { Component, Input, Output, EventEmitter, HostListener, ElementRef, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SearchComponent } from '../../../shared/components/search/search.component';
import { NotificationsDropdownComponent } from '../notifications-dropdown/notifications-dropdown.component';
import { Notification } from '../../../core/models/tournament.model';
import { SearchService, SearchResult } from '../../../core/services/search.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [IconComponent, SearchComponent, NotificationsDropdownComponent, RouterLink],
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {
    private elementRef = inject(ElementRef);
    private searchService = inject(SearchService);
    private router = inject(Router);

    @Input() isMobile = false;
    @Input() windowSize = window.innerWidth;
    @Input() title = '';
    @Input() unreadCount = 0;
    @Input() notifications: Notification[] = [];
    @Input() showSidebarToggle = true;

    @Output() toggleSidebar = new EventEmitter<void>();
    @Output() viewNotification = new EventEmitter<Notification>();
    @Output() viewAllNotifications = new EventEmitter<void>();

    searchResults = toSignal(this.searchService.searchResults, { initialValue: [] as SearchResult[] });
    isSearching = toSignal(this.searchService.isSearching, { initialValue: false });
    showNotifications = false;

    onSearchChange(query: string): void {
        this.searchService.search(query);
    }

    onSearchResultSelected(result: SearchResult): void {
        this.router.navigate([result.route]);
        this.searchService.clearSearch();
    }

    onSearchCleared(): void {
        this.searchService.clearSearch();
    }

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
