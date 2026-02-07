import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TournamentService } from '../../../../core/services/tournament.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { Tournament } from '../../../../core/models/tournament.model';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormControlComponent } from '../../../../shared/components/form-control/form-control.component';
import { SelectComponent, SelectOption } from '../../../../shared/components/select/select.component';
import { FileUploadComponent } from '../../../../shared/components/file-upload/file-upload.component';

@Component({
    selector: 'app-team-registration-modal',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonComponent,
        ModalComponent,
        FormControlComponent,
        SelectComponent,
        FileUploadComponent
    ],
    template: `
        <app-modal 
            [visible]="isVisible"
            title="تسجيل الفريق" 
            icon="rocket_launch"
            width="500px"
            (close)="close()">
            
            <div class="form-body">
                <app-form-control 
                    label="الرقم المحول منه"
                    [(ngModel)]="registerForm.fromNumber"
                    placeholder="رقم الجوال المحول منه">
                </app-form-control>

                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 700; color: #f8fafc; margin-bottom: 0.5rem; text-align: right;">نوع التحويل</label>
                    <app-select 
                        [(ngModel)]="registerForm.transferType"
                        [options]="transferOptions"
                        placeholder="اختر النوع">
                    </app-select>
                </div>

                <div class="form-group">
                    <app-file-upload 
                        label="إيصال الدفع" 
                        accept="image/*"
                        [multiple]="false"
                        (filesSelected)="onFileSelected($event)">
                    </app-file-upload>
                </div>
            </div>

            <div class="modal-footer" style="margin-top: 2rem; display: flex; gap: 1rem; justify-content: flex-end;">
                <app-button variant="ghost" (onClick)="close()">إلغاء</app-button>
                <app-button variant="primary" icon="send" (onClick)="submit()" [isLoading]="isSubmitting"
                    [disabled]="!registerForm.fromNumber || !registerForm.transferType || !registerForm.receipt">إرسال الطلب</app-button>
            </div>
        </app-modal>
    `
})
export class TeamRegistrationModalComponent {
    @Input() tournament: Tournament | null = null;
    @Input() isVisible = false;
    @Output() closeEvent = new EventEmitter<void>();
    @Output() successEvent = new EventEmitter<void>();

    private tournamentService = inject(TournamentService);
    private authService = inject(AuthService);
    private uiFeedback = inject(UIFeedbackService);

    isSubmitting = false;
    registerForm = {
        fromNumber: '',
        transferType: '',
        receipt: null as File | null
    };

    transferOptions: SelectOption[] = [
        { label: 'STC Pay', value: 'STC Pay', icon: 'payments' },
        { label: 'Urpay', value: 'Urpay', icon: 'credit_card' },
        { label: 'تحويل بنكي', value: 'Bank Transfer', icon: 'account_balance' }
    ];

    close(): void {
        this.isVisible = false;
        this.resetForm();
        this.closeEvent.emit();
    }

    resetForm(): void {
        this.registerForm = {
            fromNumber: '',
            transferType: '',
            receipt: null
        };
        this.isSubmitting = false;
    }

    onFileSelected(files: File[]): void {
        if (files && files.length > 0) {
            this.registerForm.receipt = files[0];
        }
    }

    submit(): void {
        if (!this.registerForm.fromNumber || !this.registerForm.transferType || !this.registerForm.receipt) {
            this.uiFeedback.error('خطأ', 'يرجى تعبئة جميع الحقول المطلوبة');
            return;
        }

        if (!this.tournament) return;
        const currentUser = this.authService.getCurrentUser();
        if (!currentUser?.teamId) {
            this.uiFeedback.error('خطأ', 'يجب إنشاء فريق أولاً لتتمكن من التسجيل');
            return;
        }

        this.isSubmitting = true;

        // Step 1: Register Team (PendingPayment)
        this.tournamentService.requestTournamentRegistration(this.tournament.id, currentUser.teamId, '', '', '').subscribe({
            next: () => this.uploadPayment(currentUser.teamId!),
            error: (err: any) => {
                if (err.status === 409) {
                    // Already registered, try to just upload the payment
                    this.uploadPayment(currentUser.teamId!);
                } else {
                    this.isSubmitting = false;
                    this.uiFeedback.error('خطأ', err.error?.message || 'فشل تقديم طلب التسجيل');
                }
            }
        });
    }

    private uploadPayment(teamId: string): void {
        if (!this.tournament || !this.registerForm.receipt) return;

        this.tournamentService.submitPaymentReceipt(this.tournament.id, teamId, this.registerForm.receipt, this.registerForm.fromNumber).subscribe({
            next: () => {
                this.isSubmitting = false;
                this.uiFeedback.success('تم بنجاح', 'تم تقديم طلب التسجيل وإيصال الدفع بنجاح');
                this.successEvent.emit();
                this.close();
            },
            error: (err: any) => {
                this.isSubmitting = false;
                this.uiFeedback.error('خطأ في رفع الإيصال', err.error?.message || 'تم حجز مكانك ولكن فشل رفع الإيصال، يرجى المحاولة مرة أخرى');
            }
        });
    }
}
