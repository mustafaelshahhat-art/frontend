import { Component, ChangeDetectionStrategy, inject, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { IconComponent } from '../shared/components/icon/icon.component';
import { PageHeaderComponent } from '../shared/components/page-header/page-header.component';
import { AuthStore } from '../core/stores/auth.store';
import { LayoutOrchestratorService } from '../core/services/layout-orchestrator.service';

@Component({
    selector: 'app-guest-layout',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        IconComponent,
        PageHeaderComponent
    ],
    // PERF-FIX F10: Extracted inline template (~130 lines) + styles (~430 lines) to external files
    templateUrl: './guest-layout.component.html',
    styleUrls: ['./guest-layout.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class GuestLayoutComponent implements OnInit {
    private readonly authStore = inject(AuthStore);
    public readonly router = inject(Router);
    public readonly layout = inject(LayoutOrchestratorService);

    currentUser = this.authStore.currentUser;
    isMobile = false;
    windowSize = window.innerWidth;
    isMobileMenuOpen = false;
    currentYear = new Date().getFullYear();

    ngOnInit(): void {
        this.checkScreenSize();
    }

    @HostListener('window:resize')
    onResize(): void {
        this.checkScreenSize();
    }

    private checkScreenSize(): void {
        this.windowSize = window.innerWidth;
        this.isMobile = this.windowSize < 992;
        if (!this.isMobile) {
            this.isMobileMenuOpen = false; // Close menu on resize to desktop
        }
    }

    toggleMobileMenu(): void {
        this.isMobileMenuOpen = !this.isMobileMenuOpen;
    }

    handleLogout(): void {
        this.authStore.clearAuth();
        localStorage.clear();
        this.router.navigate(['/']);
    }
}
