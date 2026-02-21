import { Component, EventEmitter, Input, Output, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TournamentService } from '../../../../core/services/tournament.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { firstValueFrom } from 'rxjs';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { Tournament, TeamRegistration } from '../../../../core/models/tournament.model';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormControlComponent } from '../../../../shared/components/form-control/form-control.component';
import { SelectComponent, SelectOption } from '../../../../shared/components/select/select.component';
import { FileUploadComponent } from '../../../../shared/components/file-upload/file-upload.component';
import { Team } from '../../../../core/models/team.model';
import { TeamService } from '../../../../core/services/team.service';

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
    templateUrl: './team-registration-modal.component.html',
    styleUrls: ['./team-registration-modal.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeamRegistrationModalComponent {
    @Input() tournament: Tournament | null = null;
    @Input() isVisible = false;
    @Output() closeEvent = new EventEmitter<void>();
    @Output() successEvent = new EventEmitter<TeamRegistration>();

    private tournamentService = inject(TournamentService);
    private authService = inject(AuthService);
    private uiFeedback = inject(UIFeedbackService);

    isSubmitting = false;
    registerForm = {
        selectedTeamId: '',
        fromNumber: '',
        transferType: '',
        receipt: null as File | null
    };

    availableTeams: Team[] = []; // List of teams where user is captain

    private teamService = inject(TeamService); // Need TeamService to fetch teams

    ngOnInit() {
        // We load teams when component inits, but ideally when modal opens.
        // Since we reuse, let's load on Init and filter.
        this.loadUserTeams();
    }

    // Load teams where user is captain
    private async loadUserTeams(): Promise<void> {
        const user = this.authService.getCurrentUser();
        if (user && user.id !== 'guest') {
            try {
                const overview = await firstValueFrom(this.teamService.getTeamsOverview());
                // Only allow teams where user is OWNER (Captain)
                this.availableTeams = overview.ownedTeams || [];

                // If only one team, auto-select
                if (this.availableTeams.length === 1) {
                    this.registerForm.selectedTeamId = this.availableTeams[0].id;
                }
            } catch {
                // silently ignore
            }
        }
    }

    get teamOptions(): SelectOption[] {
        return this.availableTeams.map(t => ({
            label: t.name,
            value: t.id,
            icon: 'groups'
        }));
    }

    get transferOptions(): SelectOption[] {
        if (!this.tournament) return [];
        const options: SelectOption[] = [];

        if (this.tournament.walletNumber) {
            options.push({ label: `محفظة إلكترونية (${this.tournament.walletNumber})`, value: 'Wallet', icon: 'account_balance_wallet' });
        }

        if (this.tournament.instaPayNumber) {
            options.push({ label: `InstaPay (${this.tournament.instaPayNumber})`, value: 'InstaPay', icon: 'currency_exchange' });
        }

        if (options.length === 0) {
            options.push({ label: 'تحويل بنكي', value: 'Bank Transfer', icon: 'account_balance' });
        } else {
            options.push({ label: 'أخرى', value: 'Other', icon: 'payments' });
        }

        return options;
    }

    close(): void {
        this.isVisible = false;
        this.resetForm();
        this.closeEvent.emit();
    }

    resetForm(): void {
        this.registerForm = {
            selectedTeamId: '',
            fromNumber: '',
            transferType: '',
            receipt: null
        };
        this.isSubmitting = false;
        // Re-select if only one team
        if (this.availableTeams.length === 1) {
            this.registerForm.selectedTeamId = this.availableTeams[0].id;
        }
    }

    onFileSelected(files: File[]): void {
        if (files && files.length > 0) {
            this.registerForm.receipt = files[0];
        }
    }

    async submit(): Promise<void> {
        if (!this.registerForm.selectedTeamId) {
            this.uiFeedback.error('فريق مطلوب', 'يرجى اختيار الفريق الذي تريد تسجيله في البطولة.');
            return;
        }

        if (!this.registerForm.fromNumber || !this.registerForm.transferType || !this.registerForm.receipt) {
            this.uiFeedback.error('بيانات ناقصة', 'يرجى تعبئة جميع الحقول المطلوبة (رقم التحويل، نوع التحويل، إيصال الدفع).');
            return;
        }

        if (!this.tournament) return;

        // Validation: User must be captain of selected team
        const selectedTeam = this.availableTeams.find(t => t.id === this.registerForm.selectedTeamId);
        if (!selectedTeam) {
            this.uiFeedback.error('فريق غير صالح', 'الفريق المختار غير متاح. يرجى اختيار فريق آخر.');
            return;
        }

        this.isSubmitting = true;

        // Step 1: Register Team (PendingPayment) - Pass TeamId explicitly
        try {
            const registration = await firstValueFrom(this.tournamentService.requestTournamentRegistration(this.tournament.id, this.registerForm.selectedTeamId));
            await this.uploadPayment(this.registerForm.selectedTeamId, registration);
        } catch (err: unknown) {
            const httpErr = err as { status?: number; error?: { message?: string } };
            if (httpErr.status === 409) {
                // Already registered, try to just upload the payment
                await this.uploadPayment(this.registerForm.selectedTeamId, null);
            } else {
                this.isSubmitting = false;
                this.uiFeedback.error('فشل التسجيل', httpErr.error?.message || 'تعذّر تقديم طلب التسجيل. يرجى المحاولة مرة أخرى.');
            }
        }
    }

    private async uploadPayment(teamId: string, initialRegistration: TeamRegistration | null): Promise<void> {
        if (!this.tournament || !this.registerForm.receipt) return;

        try {
            const updatedRegistration = await firstValueFrom(
                this.tournamentService.submitPaymentReceipt(this.tournament.id, teamId, this.registerForm.receipt, this.registerForm.fromNumber)
            );
            this.isSubmitting = false;
            this.uiFeedback.success('تم بنجاح', 'تم تقديم طلب التسجيل وإيصال الدفع بنجاح');
            this.successEvent.emit(updatedRegistration);
            this.close();
        } catch (err: unknown) {
            this.isSubmitting = false;
            const httpErr = err as { error?: { message?: string } };
            // If payment upload failed but registration succeeded, still emit the registration
            if (initialRegistration) {
                this.successEvent.emit(initialRegistration);
            }
            this.uiFeedback.error('خطأ في رفع الإيصال', httpErr.error?.message || 'تم حجز مكانك ولكن فشل رفع الإيصال، يرجى المحاولة مرة أخرى');
        }
    }
}
