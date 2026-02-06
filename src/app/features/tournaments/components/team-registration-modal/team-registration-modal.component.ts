import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TournamentService } from '../../../../core/services/tournament.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { Tournament } from '../../../../core/models/tournament.model';

@Component({
    selector: 'app-team-registration-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, CardComponent, ButtonComponent],
    template: `
        <div *ngIf="isVisible" class="modal-overlay" (click)="close()"
            style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1.5rem;">
            <app-card class="modal-box" (click)="$event.stopPropagation()" style="width: 100%; max-width: 500px;"
                title="تسجيل الفريق" icon="rocket_launch">
                <div class="form-body" style="display: flex; flex-direction: column; gap: 1.5rem;">
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 0.5rem; color: #94a3b8; font-size: 0.875rem;">الرقم المحول منه</label>
                        <input type="text" [(ngModel)]="registerForm.fromNumber" class="premium-input"
                            placeholder="رقم الجوال المحول منه"
                            style="width: 100%; padding: 0.75rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: white;">
                    </div>

                    <div class="form-group">
                        <label style="display: block; margin-bottom: 0.5rem; color: #94a3b8; font-size: 0.875rem;">نوع التحويل</label>
                        <select [(ngModel)]="registerForm.transferType" class="premium-input"
                            style="width: 100%; padding: 0.75rem; background: rgba(30, 41, 59, 1); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: white;">
                            <option value="">اختر النوع</option>
                            <option value="STC Pay">STC Pay</option>
                            <option value="Urpay">Urpay</option>
                            <option value="Bank Transfer">تحويل بنكي</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label style="display: block; margin-bottom: 0.5rem; color: #94a3b8; font-size: 0.875rem;">إيصال الدفع</label>
                        <div (click)="fileInput.click()"
                            style="border: 2px dashed rgba(255,255,255,0.1); border-radius: 12px; padding: 2rem; text-align: center; cursor: pointer; transition: all 0.3s; background: rgba(255,255,255,0.02);"
                            onmouseover="this.style.borderColor='#10B981'; this.style.background='rgba(16,185,129,0.05)'"
                            onmouseout="this.style.borderColor='rgba(255,255,255,0.1)'; this.style.background='rgba(255,255,255,0.02)'">
                            <input #fileInput type="file" (change)="onFileSelected($event)" hidden accept="image/*">
                            <span class="material-symbols-outlined"
                                style="font-size: 2.5rem; color: #10B981; margin-bottom: 0.5rem;">cloud_upload</span>
                            <p style="margin: 0; color: #94a3b8;">{{ registerForm.receipt ? registerForm.receipt.name : 'اسحب الإيصال هنا أو انقر للإرفاق' }}</p>
                        </div>
                    </div>
                </div>

                <div style="margin-top: 2rem; display: flex; gap: 1rem; justify-content: flex-end;">
                    <app-button variant="ghost" (click)="close()">إلغاء</app-button>
                    <app-button variant="primary" icon="send" (click)="submit()" [isLoading]="isSubmitting"
                        [disabled]="!registerForm.fromNumber || !registerForm.transferType || !registerForm.receipt">إرسال الطلب</app-button>
                </div>
            </app-card>
        </div>
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

    onFileSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            this.registerForm.receipt = file;
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
            next: () => {
                // Step 2: Submit Payment Receipt (PendingApproval)
                this.tournamentService.submitPaymentReceipt(this.tournament!.id, currentUser.teamId!, this.registerForm.receipt!).subscribe({
                    next: () => {
                        this.isSubmitting = false;
                        this.uiFeedback.success('تم بنجاح', 'تم تقديم طلب التسجيل بنجاح');
                        this.successEvent.emit();
                        this.close();
                    },
                    error: (err: any) => {
                        this.isSubmitting = false;
                        this.uiFeedback.error('خطأ', err.error?.message || 'فشل إرسال الإيصال');
                    }
                });
            },
            error: (err: any) => {
                this.isSubmitting = false;
                this.uiFeedback.error('خطأ', err.error?.message || 'فشل تقديم طلب التسجيل');
            }
        });
    }
}
