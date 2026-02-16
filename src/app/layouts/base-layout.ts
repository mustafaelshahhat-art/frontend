import { inject, OnInit, HostListener, effect, Directive } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../core/services/auth.service';
import { AuthStore } from '../core/stores/auth.store';
import { NotificationService } from '../core/services/notification.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LayoutOrchestratorService } from '../core/services/layout-orchestrator.service';
import { Notification } from '../core/models/tournament.model';
import { PermissionsService } from '../core/services/permissions.service';

@Directive()
export abstract class BaseLayout implements OnInit {
    protected authService = inject(AuthService);
    protected authStore = inject(AuthStore);
    protected router = inject(Router);
    protected notificationService = inject(NotificationService);
    protected permissionsService = inject(PermissionsService);
    public layout = inject(LayoutOrchestratorService);

    isSidebarOpen = true;
    isMobile = false;
    windowSize = window.innerWidth;
    showNotifications = false;

    notifications = this.notificationService.notifications;
    unreadCount = this.notificationService.unreadCount;

    currentUser = this.authStore.currentUser;
    isAuthenticated = this.authStore.isAuthenticated;

    constructor() {
        effect(() => {
            if (!this.isAuthenticated()) {
                this.router.navigate(['/auth/login']);
            }
        });

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
        if (notification.actionUrl) {
            this.router.navigateByUrl(notification.actionUrl);
        }
    }

    onNavLinkClick(): void {
        if (this.isMobile) {
            this.isSidebarOpen = false;
        }
    }
}
