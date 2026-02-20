import { IconComponent } from '../../../shared/components/icon/icon.component';
import { Component, inject, OnInit, signal, ChangeDetectionStrategy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { SystemSettingsService } from '../../../core/services/system-settings.service';
import { UserRole, User } from '../../../core/models/user.model';
import { FormControlComponent } from '../../../shared/components/form-control/form-control.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { AlertComponent } from '../../../shared/components/alert/alert.component';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [IconComponent,
        CommonModule,
        ReactiveFormsModule,
        RouterLink,
        FormControlComponent,
        ButtonComponent,
        AlertComponent
    ],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent implements OnInit, AfterViewInit {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private systemSettings = inject(SystemSettingsService);
    private router = inject(Router);

    loginForm: FormGroup;
    isLoading = signal(false);
    errorMessage = signal<string | null>(null);
    isMaintenanceMode = signal(false);
    isPageReady = signal(false);

    constructor() {
        this.loginForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]]
        });
    }

    ngOnInit(): void {
        this.checkMaintenance();
    }

    ngAfterViewInit(): void {
        // Deterministic class application after view initialization
        requestAnimationFrame(() => {
            this.isPageReady.set(true);
        });
    }

    private async checkMaintenance(): Promise<void> {
        try {
            const status = await firstValueFrom(this.systemSettings.getMaintenanceStatus());
            this.isMaintenanceMode.set(status.maintenanceMode);
        } catch {
            // Silently ignore — login page should always be usable.
            // If backend is down, user will see an error on actual login attempt.
            this.isMaintenanceMode.set(false);
        }
    }

    async onSubmit(): Promise<void> {
        if (this.loginForm.invalid) {
            Object.keys(this.loginForm.controls).forEach(key => {
                this.loginForm.get(key)?.markAsTouched();
            });
            return;
        }

        this.isLoading.set(true);
        this.errorMessage.set(null);

        const email = this.loginForm.value.email?.trim();
        const password = this.loginForm.value.password?.trim();

        if (!email || !password) return;

        try {
            const response = await firstValueFrom(this.authService.login({ email, password }));
            this.isLoading.set(false);
            this.handleNavigation(response.user);
        } catch (error: unknown) {
            const httpErr = error as { error?: { code?: string; message?: string } };
            this.isLoading.set(false);

            // Check error.error.code because HttpClient returns HttpErrorResponse
            // where the actual backend JSON body is in the 'error' property.
            if (httpErr.error?.code === 'EMAIL_NOT_VERIFIED') {
                const email = this.loginForm.value.email?.trim();
                this.router.navigate(['/auth/verify-email'], {
                    queryParams: { email: email },
                    state: { message: 'يرجى تأكيد بريدك الإلكتروني للمتابعة' }
                });
                return;
            }

            this.errorMessage.set(httpErr.error?.message || 'حدث خطأ أثناء تسجيل الدخول');
        }
    }

    private handleNavigation(user: User): void {
        const role = user.role?.toString();

        if (role === UserRole.ADMIN) {
            this.router.navigate(['/admin/dashboard']);
        } else if (role === UserRole.TOURNAMENT_CREATOR) {
            this.router.navigate(['/creator/tournaments']);
        } else if (role === UserRole.PLAYER) {
            this.router.navigate(['/player/team-management']);
        } else {
            this.router.navigate(['/']);
        }
    }

    // Helper methods for template
    get email() {
        return this.loginForm.get('email');
    }

    get password() {
        return this.loginForm.get('password');
    }
}
