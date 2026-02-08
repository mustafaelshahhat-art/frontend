import { Component, inject, DestroyRef, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { AlertComponent } from '../../shared/components/alert/alert.component';

@Component({
    selector: 'app-verify-email',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterLink,
        ButtonComponent,
        AlertComponent
    ],
    templateUrl: './verify-email.component.html',
    styleUrls: ['./verify-email.component.scss']
})
export class VerifyEmailComponent implements OnInit {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private destroyRef = inject(DestroyRef);

    verifyForm: FormGroup;
    isLoading = signal(false);
    isResending = signal(false);
    errorMessage = signal<string | null>(null);
    successMessage = signal<string | null>(null);

    // OTP Logic
    otpDigits = ['digit1', 'digit2', 'digit3', 'digit4', 'digit5', 'digit6'];
    resendCountdown = signal(60);
    canResend = signal(false);
    timerInterval: any;

    email = '';

    constructor() {
        this.verifyForm = this.fb.group({
            digit1: ['', [Validators.required, Validators.pattern('[0-9]')]],
            digit2: ['', [Validators.required, Validators.pattern('[0-9]')]],
            digit3: ['', [Validators.required, Validators.pattern('[0-9]')]],
            digit4: ['', [Validators.required, Validators.pattern('[0-9]')]],
            digit5: ['', [Validators.required, Validators.pattern('[0-9]')]],
            digit6: ['', [Validators.required, Validators.pattern('[0-9]')]]
        });
    }

    private decodeEmail(value: string): string {
        try {
            // If it's already an email, return it
            if (value.includes('@')) return value;
            // Otherwise try to decode Base64
            return atob(value);
        } catch {
            return value;
        }
    }

    ngOnInit(): void {
        const currentUser = this.authService.getCurrentUser();

        this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
            if (params['email']) {
                this.email = this.decodeEmail(params['email']);
            } else if (currentUser?.email) {
                this.email = currentUser.email;
            }

            if (!this.email) {
                this.router.navigate(['/auth/login']);
            }

            if (params['registered'] === 'true') {
                this.successMessage.set('تم إرسال رمز التحقق إلى بريدك الإلكتروني بنجاح.');
            }
        });

        this.startResendTimer();

        // Auto-focus first digit
        setTimeout(() => {
            const firstInput = document.getElementById('digit-0');
            firstInput?.focus();
        }, 500);
    }

    startResendTimer(): void {
        this.canResend.set(false);
        this.resendCountdown.set(60);

        if (this.timerInterval) clearInterval(this.timerInterval);

        this.timerInterval = setInterval(() => {
            this.resendCountdown.update(val => val - 1);
            if (this.resendCountdown() <= 0) {
                this.canResend.set(true);
                clearInterval(this.timerInterval);
            }
        }, 1000);
    }

    onInput(event: any, index: number): void {
        const input = event.target as HTMLInputElement;
        const value = input.value;

        // Ensure only numbers and take ONLY the first char (handles double typing)
        if (value) {
            const numValue = value.replace(/[^0-9]/g, '').charAt(0);
            input.value = numValue;

            if (numValue && index < 5) {
                const nextInput = document.getElementById(`digit-${index + 1}`);
                nextInput?.focus();
            }
        }

        this.checkAndSubmit();
    }

    onKeyDown(event: KeyboardEvent, index: number): void {
        if (event.key === 'Backspace' && !this.verifyForm.get(this.otpDigits[index])?.value && index > 0) {
            const prevInput = document.getElementById(`digit-${index - 1}`);
            prevInput?.focus();
        }
    }

    onPaste(event: ClipboardEvent): void {
        event.preventDefault();
        const pasteData = event.clipboardData?.getData('text');
        if (pasteData && /^[0-9]{6}$/.test(pasteData)) {
            const digits = pasteData.split('');
            this.otpDigits.forEach((key, i) => {
                this.verifyForm.get(key)?.setValue(digits[i]);
            });
            this.checkAndSubmit();
        }
    }

    private checkAndSubmit(): void {
        if (this.verifyForm.valid) {
            this.onSubmit();
        }
    }

    onSubmit(): void {
        if (this.verifyForm.invalid) {
            this.verifyForm.markAllAsTouched();
            return;
        }

        this.isLoading.set(true);
        this.errorMessage.set(null);
        this.successMessage.set(null);

        const otp = this.otpDigits.map(key => this.verifyForm.get(key)?.value).join('');

        this.authService.verifyEmail(this.email, otp)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.isLoading.set(false);
                    this.successMessage.set('تم تفعيل الحساب بنجاح. جاري التحويل...');
                    setTimeout(() => this.router.navigate(['/auth/login']), 2000);
                },
                error: (error) => {
                    this.isLoading.set(false);
                    this.errorMessage.set(error.error?.message || 'كود التفعيل غير صحيح أو منتهي الصلاحية');
                }
            });
    }

    resendOtp(): void {
        if (!this.canResend()) return;

        this.isResending.set(true);
        this.errorMessage.set(null);
        this.successMessage.set(null);

        this.authService.resendOtp(this.email, 'EMAIL_VERIFY')
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.isResending.set(false);
                    this.successMessage.set('تم إعادة إرسال كود التفعيل بنجاح.');
                    this.startResendTimer();
                },
                error: (error) => {
                    this.isResending.set(false);
                    this.errorMessage.set(error.error?.message || 'فشل إعادة إرسال الكود. حاول مرة أخرى لاحقاً.');
                }
            });
    }

    get otp() {
        return this.verifyForm.get('otp');
    }
}
