import { Component, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { HeaderComponent } from '../../components/header/header.component';
import { NavItem } from '../../models/nav-item.model';

@Component({
    selector: 'app-captain-layout',
    standalone: true,
    imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent],
    templateUrl: './captain-layout.component.html'
})
export class CaptainLayoutComponent implements OnInit, OnDestroy {
    private authService = inject(AuthService);
    private router = inject(Router);

    isSidebarOpen = true;
    isMobile = false;
    windowSize = window.innerWidth;
    showNotifications = false;
    unreadCount = 1;

    currentUser = this.authService.getCurrentUser();

    navItems: NavItem[] = [
        { label: 'لوحة التحكم', icon: 'dashboard', route: '/captain/dashboard' },
        { label: 'فريقي', icon: 'groups', route: '/captain/team' },
        { label: 'المباريات', icon: 'sports_soccer', route: '/captain/matches' },
        { label: 'البطولات', icon: 'emoji_events', route: '/captain/championships' },
        { label: 'الاعتراضات', icon: 'gavel', route: '/captain/objections' },
        { label: 'الإشعارات', icon: 'notifications', route: '/captain/notifications' }
    ];

    notifications = [
        {
            id: '1',
            title: 'مباراة قادمة',
            message: 'مباراتكم القادمة ستبدأ خلال ساعة',
            type: 'info',
            isRead: false,
            date: new Date()
        }
    ];

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
        this.authService.logout();
        this.router.navigate(['/auth/login']);
    }

    viewNotification(notification: any): void {
        notification.isRead = true;
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
