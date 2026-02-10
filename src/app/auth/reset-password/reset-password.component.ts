import { IconComponent } from '../../shared/components/icon/icon.component';
import { Component, inject, DestroyRef, OnInit, signal, ChangeDetectionStrategy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timer, interval, take } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { FormControlComponent } from '../../shared/components/form-control/form-control.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { AlertComponent } from '../../shared/components/alert/alert.component';

@Component({
    selector: 'app-reset-password',
    standalone: true,
    imports: [IconComponent, CommonModule, ReactiveFormsModule, FormControlComponent, ButtonComponent, AlertComponent],
    templateUrl: './reset-password.component.html',
    styleUrls: ['./reset-password.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResetPasswordComponent implements OnInit, AfterViewInit {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private destroyRef = inject(DestroyRef);

    resetForm: FormGroup = this.fb.group({
        otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    isLoading = signal(false);
    isResending = signal(false);
    isPageReady = signal(false);
    errorMessage = signal<string | null>(null);
    successMessage = signal<string | null>(null);
    email: string | null = null;

    resendCountdown = signal(60);
    canResend = signal(false);

    private decodeEmail(value: string): string {
        try {
            if (!value) return '';
            if (value.includes('@')) return value;
            return atob(value);
        } catch {
            return value;
        }
    }

    ngOnInit() {
        this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
            const rawEmail = params['email'];
            this.email = rawEmail ? this.decodeEmail(rawEmail) : null;

            if (!this.email) {
                this.router.navigate(['/auth/forgot-password']);
            }

            if (params['sent'] === 'true') {
                this.successMessage.set('تم إرسال رمز التحقق إلى بريدك الإلكتروني بنجاح.');
            }
        });

        this.startResendTimer();
    }

    ngAfterViewInit(): void {
        requestAnimationFrame(() => {
            this.isPageReady.set(true);
        });
    }

    startResendTimer(): void {
        this.canResend.set(false);
        this.resendCountdown.set(60);

        interval(1000)
            .pipe(
                take(60),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (val) => {
                    this.resendCountdown.set(59 - val);
                },
                complete: () => {
                    this.canResend.set(true);
                }
            });
    }

    resendOtp(): void {
        if (!this.email || !this.canResend()) return;

        this.isResending.set(true);
        this.errorMessage.set(null);
        this.successMessage.set(null);

        this.authService.resendOtp(this.email, 'PASSWORD_RESET')
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.isResending.set(false);
                    this.successMessage.set('تم إعادة إرسال كود التحقق بنجاح.');
                    this.startResendTimer();
                },
                error: (error) => {
                    this.isResending.set(false);
                    this.errorMessage.set(error.error?.message || 'فشل إعادة إرسال الكود. حاول مرة أخرى لاحقاً.');
                }
            });
    }

    get otp() { return this.resetForm.get('otp'); }
    get password() { return this.resetForm.get('password'); }
    get confirmPassword() { return this.resetForm.get('confirmPassword'); }

    passwordMatchValidator(g: FormGroup) {
        return g.get('password')?.value === g.get('confirmPassword')?.value
            ? null : { mismatch: true };
    }

    onSubmit() {
        if (this.resetForm.invalid) {
            this.resetForm.markAllAsTouched();
            return;
        }

        if (!this.email) return;

        this.isLoading.set(true);
        this.errorMessage.set(null);
        this.successMessage.set(null);

        const { otp, password } = this.resetForm.value;

        this.authService.resetPassword(this.email, otp, password)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.isLoading.set(false);
                    this.successMessage.set('تم تغيير كلمة المرور بنجاح. جاري تحويلك لتسجيل الدخول...');

                    timer(2000)
                        .pipe(takeUntilDestroyed(this.destroyRef))
                        .subscribe(() => {
                            this.router.navigate(['/auth/login']);
                        });
                },
                error: (err) => {
                    this.isLoading.set(false);
                    this.errorMessage.set(err.error?.message || 'فشل تغيير كلمة المرور. تأكد من صحة الكود.');
                }
            });
    }
}
