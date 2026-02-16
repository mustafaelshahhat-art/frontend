import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../components/sidebar/sidebar.component';
import { HeaderComponent } from '../components/header/header.component';
import { NavItem } from '../../shared/models/nav-item.model';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { Permission } from '../../core/permissions/permissions.model';
import { BaseLayout } from '../base-layout';

@Component({
    selector: 'app-admin-layout',
    standalone: true,
    imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent, BreadcrumbComponent, PageHeaderComponent],
    templateUrl: './admin-layout.component.html',
    styleUrls: ['./admin-layout.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminLayoutComponent extends BaseLayout {
    allNavItems: NavItem[] = [
        { label: 'لوحة التحكم', icon: 'dashboard', route: '/admin/dashboard', permission: Permission.VIEW_ADMIN_DASHBOARD },
        { label: 'البطولات', icon: 'emoji_events', route: '/admin/tournaments', permission: Permission.MANAGE_TOURNAMENTS },
        { label: 'الفرق', icon: 'groups', route: '/admin/teams', permission: Permission.MANAGE_TEAMS },
        { label: 'المباريات', icon: 'sports_soccer', route: '/admin/matches', permission: Permission.MANAGE_MATCHES },
        { label: 'المستخدمين', icon: 'person', route: '/admin/users', permission: Permission.MANAGE_USERS },

        { label: 'الطلبات المالية', icon: 'payments', route: '/admin/payment-requests', permission: Permission.VIEW_PAYMENTS },
        { label: 'الإشعارات', icon: 'notifications', route: '/admin/notifications', permission: Permission.VIEW_NOTIFICATIONS },
        { label: 'سجل النشاطات', icon: 'history', route: '/admin/activity-log', permission: Permission.VIEW_LOGS },
        { label: 'إدارة المناطق', icon: 'location_on', route: '/admin/locations', permission: Permission.MANAGE_SETTINGS },
        { label: 'الإعدادات', icon: 'settings', route: '/admin/settings', permission: Permission.MANAGE_SETTINGS }
    ];

    get navItems(): NavItem[] {
        return this.allNavItems.filter(item =>
            !item.permission || this.permissionsService.has(item.permission as Permission)
        );
    }

    viewAllNotifications(): void {
        this.showNotifications = false;
        this.router.navigate(['/admin/notifications']);
    }
}
