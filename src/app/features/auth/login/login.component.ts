import { IconComponent } from '../../../shared/components/icon/icon.component';
import { Component, inject, DestroyRef, OnInit, signal, ChangeDetectionStrategy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
    private destroyRef = inject(DestroyRef);

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

    private checkMaintenance(): void {
        this.systemSettings.getMaintenanceStatus().subscribe({
            next: (status) => {
                this.isMaintenanceMode.set(status.maintenanceMode);
            }
        });
    }

    onSubmit(): void {
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

        this.authService.login({ email, password })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (response) => {
                    this.isLoading.set(false);
                    this.handleNavigation(response.user);
                },
                error: (error) => {
                    this.isLoading.set(false);

                    // Check error.error.code because HttpClient returns HttpErrorResponse
                    // where the actual backend JSON body is in the 'error' property.
                    if (error.error?.code === 'EMAIL_NOT_VERIFIED') {
                        const email = this.loginForm.value.email?.trim();
                        this.router.navigate(['/auth/verify-email'], {
                            queryParams: { email: email },
                            state: { message: 'يرجى تأكيد بريدك الإلكتروني للمتابعة' }
                        });
                        return;
                    }

                    this.errorMessage.set(error.error?.message || 'حدث خطأ أثناء تسجيل الدخول');
                }
            });
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
