import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavItem } from '../../models/nav-item.model';
import { UIFeedbackService } from '../../services/ui-feedback.service';

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [CommonModule, RouterModule],
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
}
