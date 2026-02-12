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
    selector: 'app-player-layout',
    standalone: true,
    imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent, BreadcrumbComponent, PageHeaderComponent, ButtonComponent],
    templateUrl: './player-layout.component.html',
    styleUrls: ['./player-layout.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayerLayoutComponent extends BaseLayout {
    get navItems(): NavItem[] {
        const items: NavItem[] = [
            { label: 'إدارة الفريق', icon: 'groups', route: '/player/team-management' },
            { label: 'المباريات', icon: 'sports_soccer', route: '/player/matches' },
            { label: 'البطولات', icon: 'emoji_events', route: '/player/tournaments' },

            { label: 'الإشعارات', icon: 'notifications', route: '/player/notifications' },
            { label: 'الحساب الشخصي', icon: 'person', route: '/player/profile' }
        ];

        return items;
    }

    get brandSubtitle(): string {
        return this.permissionsService.isTeamCaptain() ? 'إدارة الفريق' : 'حساب اللاعب';
    }

    get userRoleLabel(): string {
        const user = this.currentUser();
        if (this.permissionsService.isTeamCaptain()) return 'قائد فريق';
        if (user?.teamId) return 'لاعب فريق';
        return 'لاعب حر';
    }

    viewAllNotifications(): void {
        this.showNotifications = false;
        this.router.navigate(['/player/notifications']);
    }
}
