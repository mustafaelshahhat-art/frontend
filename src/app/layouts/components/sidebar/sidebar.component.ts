import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavItem } from '../../../shared/models/nav-item.model';
import { SmartImageComponent } from '../../../shared/components/smart-image/smart-image.component';
import { UIFeedbackService } from '../../../shared/services/ui-feedback.service';

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        SmartImageComponent
    ],
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
    private uiFeedback = inject(UIFeedbackService);

    @Input() isOpen: boolean = false;
    @Input() isMobile: boolean = false;
    @Input() navItems: NavItem[] = [];
    @Input() currentUser: any;
    @Input() brandSubtitle: string = 'لوحة التحكم';
    @Input() userRoleLabel: string = 'مسؤول';

    @Output() close = new EventEmitter<void>();
    @Output() logout = new EventEmitter<void>();

    handleClose() {
        this.close.emit();
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
            case 'ADMIN':
                return '/admin/settings';
            case 'REFEREE':
                return '/referee/profile';
            default:
                // Both Player and Captain currently share the 'captain' layout routes
                return '/captain/profile';
        }
    }

    get roleLabel(): string {
        if (!this.currentUser) return this.userRoleLabel;

        switch (this.currentUser.role) {
            case 'ADMIN': return 'مسؤول النظام';
            case 'REFEREE': return 'حكم الساحة';
            case 'PLAYER':
                if (this.currentUser.isTeamOwner) return 'قائد الفريق';
                return this.currentUser.teamId ? 'لاعب بالفريق' : 'لاعب حر';
            default: return this.userRoleLabel;
        }
    }
}
