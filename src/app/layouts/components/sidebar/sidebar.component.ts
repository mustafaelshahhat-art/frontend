import { IconComponent } from '../../../shared/components/icon/icon.component';
import { Component, Input, Output, EventEmitter, inject, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule } from '@angular/router';
import { NavItem } from '../../../shared/models/nav-item.model';
import { User, TeamRole } from '../../../core/models/user.model';
import { SmartImageComponent } from '../../../shared/components/smart-image/smart-image.component';
import { UIFeedbackService } from '../../../shared/services/ui-feedback.service';
import { PermissionsService } from '../../../core/services/permissions.service';

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
    private permissionsService = inject(PermissionsService);

    @Input() isOpen = false;
    @Input() isMobile = false;
    @Input() navItems: NavItem[] = [];
    @Input() currentUser: User | null = null;
    @Input() brandSubtitle = 'لوحة التحكم';
    @Input() profileRoute = '/player/profile';
    @Input() userRoleLabel = 'لاعب';

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

    get roleLabel(): string {
        return this.userRoleLabel;
    }

    get profileRouteValue(): string {
        return this.profileRoute;
    }
}
