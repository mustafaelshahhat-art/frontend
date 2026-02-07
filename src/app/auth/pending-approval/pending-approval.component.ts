import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-pending-approval',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './pending-approval.component.html',
    styleUrls: ['./pending-approval.component.scss']
})
export class PendingApprovalComponent {
    private authService = inject(AuthService);
    private router = inject(Router);

    currentUser = this.authService.getCurrentUser();

    onLogout(): void {
        this.authService.logout();
        this.router.navigate(['/auth/login']);
    }

    goToHome(): void {
        const role = this.currentUser?.role?.toLowerCase();
        if (role === 'referee') {
            this.router.navigate(['/referee/dashboard']);
        } else {
            // Player/Captain goes to team page
            this.router.navigate(['/captain/team']);
        }
    }
}

