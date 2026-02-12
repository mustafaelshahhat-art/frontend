import { IconComponent } from '../../../shared/components/icon/icon.component';
import { Component, Input, Output, EventEmitter, inject, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule } from '@angular/router';
import { NavItem } from '../../../shared/models/nav-item.model';
import { User } from '../../../core/models/user.model';
import { SmartImageComponent } from '../../../shared/components/smart-image/smart-image.component';
import { UIFeedbackService } from '../../../shared/services/ui-feedback.service';

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [IconComponent,
        RouterModule,
        SmartImageComponent
    ],
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
    private uiFeedback = inject(UIFeedbackService);

    @Input() isOpen = false;
    @Input() isMobile = false;
    @Input() navItems: NavItem[] = [];
    @Input() currentUser: User | null = null;
    @Input() brandSubtitle = 'لوحة التحكم';
    @Input() userRoleLabel = 'مسؤول';

    @Output() closeSidebar = new EventEmitter<void>();
    @Output() logout = new EventEmitter<void>();

    handleClose() {
        this.closeSidebar.emit();
    }

    handleLogout() {
        this.uiFeedback.confirm(
            'تأكيد تسجيل الخروج',
            'هل أنت متأكد من رغبتك في تسجيل الخروج؟',
            'تسجيل الخروج',
            'danger'
        ).subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.logout.emit();
            }
        });
    }

    getProfileRoute(): string {
        if (!this.currentUser) return '/';

        switch (this.currentUser.role) {
            case 'Admin':
                return '/admin/settings';
            case 'TournamentCreator':
                return '/captain/profile';

            default:
                // Both Player and Captain currently share the 'captain' layout routes
                return '/captain/profile';
        }
    }

    get roleLabel(): string {
        if (!this.currentUser) return this.userRoleLabel;

        switch (this.currentUser.role) {
            case 'Admin': return 'مسؤول النظام';
            case 'TournamentCreator': return 'منشئ بطولة';

            case 'Player':
                if (this.currentUser.isTeamOwner) return 'قائد الفريق';
                return this.currentUser.teamId ? 'لاعب بالفريق' : 'لاعب حر';
            default: return this.userRoleLabel;
        }
    }
}
