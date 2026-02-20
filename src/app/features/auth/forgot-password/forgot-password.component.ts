import { IconComponent } from '../../../shared/components/icon/icon.component';
import { Component, inject, signal, ChangeDetectionStrategy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { FormControlComponent } from '../../../shared/components/form-control/form-control.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { AlertComponent } from '../../../shared/components/alert/alert.component';

@Component({
    selector: 'app-forgot-password',
    standalone: true,
    imports: [IconComponent, CommonModule, ReactiveFormsModule, RouterLink, FormControlComponent, ButtonComponent, AlertComponent],
    templateUrl: './forgot-password.component.html',
    styleUrls: ['./forgot-password.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ForgotPasswordComponent implements AfterViewInit {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);

    forgotForm: FormGroup = this.fb.group({
        email: ['', [Validators.required, Validators.email]]
    });

    isLoading = signal(false);
    errorMessage = signal<string | null>(null);
    isPageReady = signal(false);

    ngAfterViewInit(): void {
        requestAnimationFrame(() => {
            this.isPageReady.set(true);
        });
    }

    get email() {
        return this.forgotForm.get('email');
    }

    async onSubmit(): Promise<void> {
        if (this.forgotForm.invalid) {
            this.forgotForm.markAllAsTouched();
            return;
        }

        this.isLoading.set(true);
        this.errorMessage.set(null);

        const email = this.forgotForm.value.email;

        try {
            await firstValueFrom(this.authService.forgotPassword(email));
            this.isLoading.set(false);
            const encodedEmail = btoa(email);
            this.router.navigate(['/auth/reset-password'], {
                queryParams: {
                    email: encodedEmail,
                    sent: 'true'
                }
            });
        } catch (err: unknown) {
            const httpErr = err as { error?: { message?: string } };
            this.isLoading.set(false);
            // Use the backend message if available, otherwise a generic one
            this.errorMessage.set(httpErr.error?.message || 'فشل الطلب. يرجى المحاولة لاحقاً.');
        }
    }
}
