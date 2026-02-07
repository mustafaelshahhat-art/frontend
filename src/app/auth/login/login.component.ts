import { Component, inject, DestroyRef, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { SystemSettingsService } from '../../core/services/system-settings.service';
import { UserRole } from '../../core/models/user.model';
import { FormControlComponent } from '../../shared/components/form-control/form-control.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { AlertComponent } from '../../shared/components/alert/alert.component';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterLink,
        FormControlComponent,
        ButtonComponent,
        AlertComponent
    ],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private systemSettings = inject(SystemSettingsService);
    private router = inject(Router);
    private destroyRef = inject(DestroyRef);

    loginForm: FormGroup;
    isLoading = signal(false);
    errorMessage = signal<string | null>(null);
    isMaintenanceMode = signal(false);

    constructor() {
        this.loginForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]]
        });
    }

    ngOnInit(): void {
        this.checkMaintenance();
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
                    this.errorMessage.set(error.message || 'حدث خطأ أثناء تسجيل الدخول');
                }
            });
    }

    private handleNavigation(user: any): void {
        const role = user.role?.toString();

        if (role === UserRole.ADMIN) {
            this.router.navigate(['/admin/dashboard']);
        } else if (role === UserRole.REFEREE) {
            this.router.navigate(['/referee/dashboard']);
        } else if (role === UserRole.PLAYER) {
            this.router.navigate(['/captain/team']);
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
