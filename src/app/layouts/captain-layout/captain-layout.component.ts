import { Component, inject, OnInit, HostListener, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { AuthStore } from '../../core/stores/auth.store';
import { SidebarComponent } from '../components/sidebar/sidebar.component';
import { HeaderComponent } from '../components/header/header.component';
import { NavItem } from '../../shared/models/nav-item.model';
import { NotificationService } from '../../core/services/notification.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { Permission } from '../../core/permissions/permissions.model';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserStatus } from '../../core/models/user.model';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { CaptainLayoutService } from '../../core/services/captain-layout.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { Notification } from '../../core/models/tournament.model';

@Component({
    selector: 'app-captain-layout',
    standalone: true,
    imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent, BreadcrumbComponent, PageHeaderComponent, ButtonComponent],
    templateUrl: './captain-layout.component.html',
    styleUrls: ['./captain-layout.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CaptainLayoutComponent implements OnInit {
    private authService = inject(AuthService);
    private authStore = inject(AuthStore);
    private router = inject(Router);
    private notificationService = inject(NotificationService);
    private permissionsService = inject(PermissionsService);
    public layout = inject(CaptainLayoutService);

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

    get filteredNavItems(): NavItem[] {
        return this.navItems.filter(item => {
            if (item.route === '/captain/objections') {
                return this.permissionsService.has(Permission.VIEW_OBJECTIONS);
            }
            return true;
        });
    }

    private navItems: NavItem[] = [
        { label: 'فريقي', icon: 'groups', route: '/captain/team' },
        { label: 'المباريات', icon: 'sports_soccer', route: '/captain/matches' },
        { label: 'البطولات', icon: 'emoji_events', route: '/captain/championships' },
        { label: 'الاعتراضات', icon: 'gavel', route: '/captain/objections' },
        { label: 'الإشعارات', icon: 'notifications', route: '/captain/notifications' },
        { label: 'الملف الشخصي', icon: 'person', route: '/captain/profile' }
    ];


    constructor() {
        // Effect to react to auth state changes
        effect(() => {
            if (!this.isAuthenticated()) {
                this.router.navigate(['/auth/login']);
            }
            // Update pending status reactively
            this.isPending = this.currentUser()?.status === UserStatus.PENDING;
        });

        // Auto-close on navigation (Mobile only)
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            takeUntilDestroyed()
        ).subscribe(() => {
            if (this.isMobile) {
                this.isSidebarOpen = false;
            }
            this.showNotifications = false;
        });
    }

    ngOnInit(): void {
        this.checkScreenSize();

        // Force closed on mobile initially
        if (this.isMobile) {
            this.isSidebarOpen = false;
        }
    }

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

    viewNotification(notification: Notification): void {
        this.notificationService.markAsRead(notification.id).subscribe();
        this.showNotifications = false;
    }

    viewAllNotifications(): void {
        this.showNotifications = false;
        this.router.navigate(['/captain/notifications']);
    }

    onNavLinkClick(): void {
        if (this.isMobile) {
            this.isSidebarOpen = false;
        }
    }

    getTypeColor(type: string): string {
        switch (type) {
            case 'info': return 'var(--color-info)';
            case 'warning': return 'var(--color-warning)';
            case 'error': return 'var(--color-danger)';
            case 'success': return 'var(--color-success)';
            default: return 'var(--text-muted)';
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
}
