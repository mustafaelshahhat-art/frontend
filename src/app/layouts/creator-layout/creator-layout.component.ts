import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../components/sidebar/sidebar.component';
import { HeaderComponent } from '../components/header/header.component';
import { NavItem } from '../../shared/models/nav-item.model';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { BaseLayout } from '../base-layout';

import { ButtonComponent } from '../../shared/components/button/button.component';

@Component({
    selector: 'app-creator-layout',
    standalone: true,
    imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent, BreadcrumbComponent, PageHeaderComponent, ButtonComponent],
    templateUrl: './creator-layout.component.html',
    styleUrls: ['./creator-layout.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreatorLayoutComponent extends BaseLayout {
    navItems: NavItem[] = [
        { label: 'بطولاتي', icon: 'emoji_events', route: '/creator/tournaments' },
        { label: 'المباريات', icon: 'sports_soccer', route: '/creator/matches' },
        { label: 'الطلبات المالية', icon: 'payments', route: '/creator/payment-requests' },

        { label: 'الإشعارات', icon: 'notifications', route: '/creator/notifications' },
        { label: 'حسابي الشخصي', icon: 'person', route: '/creator/profile' }
    ];

    brandSubtitle = 'منظم البطولات';
    userRoleLabel = 'منظم بطولة';

    viewAllNotifications(): void {
        this.showNotifications = false;
        this.router.navigate(['/creator/notifications']);
    }
}
