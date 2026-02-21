import { IconComponent } from '../../../shared/components/icon/icon.component';
import { Component, inject, DestroyRef, OnInit, signal, ChangeDetectionStrategy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom, timer, interval, take } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { AlertComponent } from '../../../shared/components/alert/alert.component';

@Component({
    selector: 'app-verify-email',
    standalone: true,
    imports: [IconComponent,
        CommonModule,
        ReactiveFormsModule,
        RouterLink,
        ButtonComponent,
        AlertComponent
    ],
    templateUrl: './verify-email.component.html',
    styleUrls: ['./verify-email.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class VerifyEmailComponent implements OnInit, AfterViewInit {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private destroyRef = inject(DestroyRef);

    verifyForm: FormGroup;
    isLoading = signal(false);
    isResending = signal(false);
    isPageReady = signal(false);
    errorMessage = signal<string | null>(null);
    successMessage = signal<string | null>(null);

    // OTP Logic
    otpDigits = ['digit1', 'digit2', 'digit3', 'digit4', 'digit5', 'digit6'];
    resendCountdown = signal(60);
    canResend = signal(false);

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
        if (!value) return '';
        if (value.includes('@')) return value;
        try {
            return atob(value);
        } catch {
            return value;
        }
    }

    ngOnInit(): void {
        this.startResendTimer();
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
    }

    ngAfterViewInit(): void {
        requestAnimationFrame(() => {
            this.isPageReady.set(true);
            const firstInput = document.getElementById('digit-0');
            firstInput?.focus();
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

    onInput(event: Event, index: number): void {
        const input = event.target as HTMLInputElement;
        const value = input.value;

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

            // Focus on the last digit after pasting
            const lastInput = document.getElementById(`digit-5`);
            lastInput?.focus();

            this.checkAndSubmit();
        }
    }

    private checkAndSubmit(): void {
        if (this.verifyForm.valid) {
            this.onSubmit();
        }
    }

    async onSubmit(): Promise<void> {
        if (this.verifyForm.invalid) {
            this.verifyForm.markAllAsTouched();
            return;
        }

        this.isLoading.set(true);
        this.errorMessage.set(null);
        this.successMessage.set(null);

        const otp = this.otpDigits.map(key => this.verifyForm.get(key)?.value).join('');

        if (!this.email) {
            this.errorMessage.set('حدث خطأ: البريد الإلكتروني غير موجود');
            return;
        }

        try {
            await firstValueFrom(this.authService.verifyEmail(this.email.trim(), otp));
            this.isLoading.set(false);
            this.successMessage.set('تم تأكيد بريدك الإلكتروني بنجاح! حسابك الآن قيد المراجعة من الإدارة. سيتم إعلامك عند تفعيل حسابك.');
            await firstValueFrom(timer(1500));
            this.router.navigate(['/auth/login']);
        } catch (error: unknown) {
            const httpErr = error as { error?: { message?: string } };
            this.isLoading.set(false);
            this.errorMessage.set(httpErr.error?.message || 'كود التفعيل غير صحيح أو منتهي الصلاحية');
        }
    }

    async resendOtp(): Promise<void> {
        if (!this.canResend()) return;

        this.isResending.set(true);
        this.errorMessage.set(null);
        this.successMessage.set(null);

        try {
            await firstValueFrom(this.authService.resendOtp(this.email.trim(), 'EMAIL_VERIFY'));
            this.isResending.set(false);
            this.successMessage.set('تم إعادة إرسال كود التفعيل بنجاح.');
            this.startResendTimer();
        } catch (error: unknown) {
            const httpErr = error as { error?: { message?: string } };
            this.isResending.set(false);
            this.errorMessage.set(httpErr.error?.message || 'فشل إعادة إرسال الكود. حاول مرة أخرى لاحقاً.');
        }
    }
}
