import { Component, inject, OnInit, OnDestroy, HostListener, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { AuthStore } from '../../core/stores/auth.store';
import { SidebarComponent } from '../components/sidebar/sidebar.component';
import { HeaderComponent } from '../components/header/header.component';
import { NavItem } from '../../shared/models/nav-item.model';
import { NotificationService } from '../../core/services/notification.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';

@Component({
    selector: 'app-referee-layout',
    standalone: true,
    imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent, BreadcrumbComponent],
    templateUrl: './referee-layout.component.html'
})
export class RefereeLayoutComponent implements OnInit, OnDestroy {
    private authService = inject(AuthService);
    private authStore = inject(AuthStore);
    private router = inject(Router);
    private notificationService = inject(NotificationService);

    isSidebarOpen = true;
    isMobile = false;
    windowSize = window.innerWidth;
    showNotifications = false;

    notifications = toSignal(this.notificationService.notifications, { initialValue: [] });
    unreadCount = toSignal(this.notificationService.unreadCount, { initialValue: 0 });

    // Reactive bindings to AuthStore
    currentUser = this.authStore.currentUser;
    isAuthenticated = this.authStore.isAuthenticated;
    isPending = false;

    navItems: NavItem[] = [
        { label: 'لوحة التحكم', icon: 'dashboard', route: '/referee/dashboard' },
        { label: 'مبارياتي', icon: 'sports_soccer', route: '/referee/matches' },
        { label: 'الإشعارات', icon: 'notifications', route: '/referee/notifications' }
    ];


    constructor() {
        // Effect to react to auth state changes
        effect(() => {
            if (!this.isAuthenticated()) {
                this.router.navigate(['/auth/login']);
            }
            // Update pending status reactively
            this.isPending = this.currentUser()?.status === 'Pending';
        });
    }

    ngOnInit(): void {
        this.checkScreenSize();
        // Force closed on mobile initially
        if (this.isMobile) {
            this.isSidebarOpen = false;
        }

        // Auto-close on navigation (Mobile only)
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe(() => {
            if (this.isMobile) {
                this.isSidebarOpen = false;
            }
            this.showNotifications = false;
        });
    }

    ngOnDestroy(): void { }

    @HostListener('window:resize')
    onResize(): void {
        this.checkScreenSize();
    }

    private checkScreenSize(): void {
        const wasMobile = this.isMobile;
        this.windowSize = window.innerWidth;
        this.isMobile = this.windowSize < 992;

        // Force state sync on viewport crossover
        if (this.isMobile && !wasMobile) {
            this.isSidebarOpen = false;
        } else if (!this.isMobile && wasMobile) {
            this.isSidebarOpen = true;
        }
    }

    toggleSidebar(): void {
        this.isSidebarOpen = !this.isSidebarOpen;
    }

    closeSidebar(): void {
        this.isSidebarOpen = false;
    }

    toggleNotifications(): void {
        this.showNotifications = !this.showNotifications;
    }

    handleLogout(): void {
        this.authService.logout(); // This now updates AuthStore
        // No need to navigate - effect handles it
    }

    viewNotification(notification: any): void {
        this.notificationService.markAsRead(notification.id).subscribe();
        this.showNotifications = false;
    }

    viewAllNotifications(): void {
        this.showNotifications = false;
        this.router.navigate(['/referee/notifications']);
    }

    onNavLinkClick(): void {
        if (this.isMobile) {
            this.isSidebarOpen = false;
        }
    }

    getTypeColor(type: string): string {
        switch (type) {
            case 'info': return '#10b981';
            case 'warning': return '#f59e0b';
            case 'error': return '#ef4444';
            case 'success': return '#10b981';
            default: return '#64748b';
        }
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

    formatTimeAgo(date: Date): string {
        const diff = Date.now() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 60) return `منذ ${minutes} دقيقة`;
        const hours = Math.floor(minutes / 60);
        return `منذ ${hours} ساعة`;
    }
}
