import { Component, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
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
export class LoginComponent {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);
    private destroyRef = inject(DestroyRef);

    loginForm: FormGroup;
    isLoading = false;
    errorMessage: string | null = null;
    passwordVisible = false;

    constructor() {
        this.loginForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]]
        });
    }

    togglePasswordVisibility(): void {
        this.passwordVisible = !this.passwordVisible;
    }

    onSubmit(): void {
        if (this.loginForm.invalid) {
            Object.keys(this.loginForm.controls).forEach(key => {
                this.loginForm.get(key)?.markAsTouched();
            });
            return;
        }

        this.isLoading = true;
        this.errorMessage = null;

        const { email, password } = this.loginForm.value;

        this.authService.login({ email, password })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (response) => {
                    this.isLoading = false;

                    // Navigate based on user role
                    switch (response.user.role) {
                        case UserRole.ADMIN:
                            this.router.navigate(['/admin/dashboard']);
                            break;
                        case UserRole.REFEREE:
                            this.router.navigate(['/referee/dashboard']);
                            break;
                        case UserRole.CAPTAIN:
                            this.router.navigate(['/captain/dashboard']);
                            break;
                        case UserRole.PLAYER:
                            this.router.navigate(['/captain/dashboard']); // Temporary redirect
                            break;
                        default:
                            this.router.navigate(['/']);
                    }
                },
                error: (error) => {
                    this.isLoading = false;
                    this.errorMessage = error.message || 'حدث خطأ أثناء تسجيل الدخول';
                }
            });
    }

    // Helper methods for template
    get email() {
        return this.loginForm.get('email');
    }

    get password() {
        return this.loginForm.get('password');
    }

    // Temporary quick login for testing
    quickLogin(role: 'admin' | 'captain' | 'referee' | 'player' | 'playerClub'): void {
        this.isLoading = true;
        this.errorMessage = null;

        const credentials: Record<string, { email: string, password: string }> = {
            admin: { email: 'admin@test.com', password: 'password' },
            captain: { email: 'player@test.com', password: 'password' },
            referee: { email: 'referee@test.com', password: 'password' },
            player: { email: 'user@test.com', password: 'password' },
            playerClub: { email: 'clubplayer@test.com', password: 'password' }
        };

        const { email, password } = credentials[role];

        this.authService.login({ email, password })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (response) => {
                    this.isLoading = false;

                    // Navigate based on user role
                    switch (response.user.role) {
                        case UserRole.ADMIN:
                            this.router.navigate(['/admin/dashboard']);
                            break;
                        case UserRole.REFEREE:
                            this.router.navigate(['/referee/dashboard']);
                            break;
                        case UserRole.CAPTAIN:
                            this.router.navigate(['/captain/dashboard']);
                            break;
                        case UserRole.PLAYER:
                            this.router.navigate(['/captain/dashboard']);
                            break;
                        default:
                            this.router.navigate(['/']);
                    }
                },
                error: (error) => {
                    this.isLoading = false;
                    this.errorMessage = error.message || 'حدث خطأ أثناء تسجيل الدخول';
                }
            });
    }
}
