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
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { TournamentCreatorLayoutService } from '../../core/services/tournament-creator-layout.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { Notification } from '../../core/models/tournament.model';
import { PermissionsService } from '../../core/services/permissions.service';
import { Permission } from '../../core/permissions/permissions.model';
import { UserRole } from '../../core/models/user.model';

@Component({
    selector: 'app-tournament-creator-layout',
    standalone: true,
    imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent, BreadcrumbComponent, PageHeaderComponent],
    templateUrl: './tournament-creator-layout.component.html',
    styleUrls: ['./tournament-creator-layout.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TournamentCreatorLayoutComponent implements OnInit {
    private authService = inject(AuthService);
    private authStore = inject(AuthStore);
    private router = inject(Router);
    private notificationService = inject(NotificationService);
    private permissionsService = inject(PermissionsService);
    public layout = inject(TournamentCreatorLayoutService);

    isSidebarOpen = true;
    isMobile = false;
    windowSize = window.innerWidth;
    showNotifications = false;

    notifications = toSignal(this.notificationService.notifications, { initialValue: [] });
    unreadCount = toSignal(this.notificationService.unreadCount, { initialValue: 0 });

    // Reactive bindings to AuthStore
    currentUser = this.authStore.currentUser;
    isAuthenticated = this.authStore.isAuthenticated;

    get navItems(): NavItem[] {
        const user = this.currentUser();
        if (user?.role === UserRole.TOURNAMENT_CREATOR || user?.role === UserRole.ADMIN) {
            return [
                { label: 'بطولاتي', icon: 'emoji_events', route: '/captain/tournaments' },
                { label: 'المباريات', icon: 'sports_soccer', route: '/captain/matches' },
                { label: 'الطلبات المالية', icon: 'payments', route: '/captain/payment-requests' },
                { label: 'الاعتراضات', icon: 'gavel', route: '/captain/objections' },
                { label: 'الإشعارات', icon: 'notifications', route: '/captain/notifications' },
                { label: 'حسابي الشخصي', icon: 'person', route: '/captain/profile' }
            ];
        }
        // Team Owner (Captain) views
        return [
            { label: 'فريقي', icon: 'groups', route: '/captain/team' },
            { label: 'المباريات', icon: 'sports_soccer', route: '/captain/matches' },
            { label: 'البطولات', icon: 'emoji_events', route: '/captain/championships' },
            { label: 'الاعتراضات', icon: 'gavel', route: '/captain/objections' },
            { label: 'الإشعارات', icon: 'notifications', route: '/captain/notifications' },
            { label: 'الملف الشخصي', icon: 'person', route: '/captain/profile' }
        ];
    }

    get brandSubtitle(): string {
        return this.currentUser()?.role === UserRole.TOURNAMENT_CREATOR ? 'منظم البطولات' : 'إدارة الفريق';
    }

    get userRoleLabel(): string {
        return this.currentUser()?.role === UserRole.TOURNAMENT_CREATOR ? 'منظم بطولة' : 'قائد فريق';
    }

    constructor() {
        // Effect to react to auth state changes
        effect(() => {
            if (!this.isAuthenticated()) {
                this.router.navigate(['/auth/login']);
            }
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
        this.authService.logout();
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
