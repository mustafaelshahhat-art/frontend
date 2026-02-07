import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ButtonComponent } from '../../shared/components/button/button.component';

@Component({
    selector: 'app-pending-approval',
    standalone: true,
    imports: [CommonModule, ButtonComponent],
    templateUrl: './pending-approval.component.html',
    styleUrls: ['./pending-approval.component.scss']
})
export class PendingApprovalComponent {
    private authService = inject(AuthService);
    private router = inject(Router);

    currentUser = this.authService.getCurrentUser();
    todayDate = '12 رمضان 1445'; // Mocked for design parity

    onLogout(): void {
        this.authService.logout();
        this.router.navigate(['/auth/login']);
    }

    reloadPage(): void {
        window.location.reload();
    }
}
