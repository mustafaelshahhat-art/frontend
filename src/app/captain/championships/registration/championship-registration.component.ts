import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TournamentService } from '../../../core/services/tournament.service';
import { TeamService } from '../../../core/services/team.service';
import { AuthService } from '../../../core/services/auth.service';
import { UIFeedbackService } from '../../../shared/services/ui-feedback.service';
import { Tournament } from '../../../core/models/tournament.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
    selector: 'app-championship-registration',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterModule,
        PageHeaderComponent,
        ButtonComponent
    ],
    templateUrl: './championship-registration.component.html',
    styleUrls: ['./championship-registration.component.scss']
})
export class ChampionshipRegistrationComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly tournamentService = inject(TournamentService);
    private readonly teamService = inject(TeamService);
    private readonly authService = inject(AuthService);
    private readonly uiFeedback = inject(UIFeedbackService);

    tournament: Tournament | null = null;
    selectedFileName: string | null = null;
    regForm!: FormGroup;
    transferDropdownOpen = false;
    transferTypes = [
        { value: 'instapay', label: 'إنستا باي', icon: 'account_balance' },
        { value: 'vodafone', label: 'فودافون كاش', icon: 'account_balance_wallet' }
    ];
    submitted = false;

    ngOnInit(): void {
        this.initForm();
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.loadTournament(id);
        }
    }

    isLoading = false;

    private initForm(): void {
        this.regForm = this.fb.group({
            phone: ['', [Validators.required, Validators.pattern(/^(01|05)\d{8,9}$/)]],
            transferType: ['', Validators.required],
        });
    }

    private loadTournament(id: string): void {
        this.tournamentService.getTournamentById(id).subscribe(t => {
            this.tournament = t || null;
        });
    }

    toggleTransferDropdown(event: Event): void {
        this.transferDropdownOpen = !this.transferDropdownOpen;
        event.stopPropagation();
    }

    selectTransferType(type: string): void {
        this.regForm.patchValue({ transferType: type });
        this.transferDropdownOpen = false;
    }

    getTransferTypeLabel(type: string): string {
        const found = this.transferTypes.find(t => t.value === type);
        return found?.label || '';
    }

    receiptFile: File | null = null;
    onFileSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            this.selectedFileName = file.name;
            this.receiptFile = file;
        }
    }

    removeFile(): void {
        this.selectedFileName = null;
        this.receiptFile = null;
    }

    get isFormValid(): boolean {
        return this.regForm.valid && !!this.receiptFile;
    }

    onSubmit(): void {
        const currentUser = this.authService.getCurrentUser();
        if (!currentUser || !currentUser.teamId || !this.tournament) {
            this.uiFeedback.error('خطأ', 'يجب أن تكون كابتن فريق لتتمكن من التسجيل');
            return;
        }

        if (!this.isFormValid || !this.receiptFile) return;

        this.isLoading = true;

        // Step 1: Register Team (PendingPaymentReview)
        this.tournamentService.requestTournamentRegistration(this.tournament.id, currentUser.teamId, '', '', '').subscribe({
            next: () => {
                // Step 2: Submit Payment Receipt (PendingPaymentReview)
                this.tournamentService.submitPaymentReceipt(this.tournament!.id, currentUser.teamId!, this.receiptFile!).subscribe({
                    next: () => {
                        this.isLoading = false;
                        this.submitted = true;
                        this.uiFeedback.success('تم الإرسال', 'تم إرسال طلب التسجيل وإيصال الدفع بنجاح');
                    },
                    error: (err) => {
                        this.isLoading = false;
                        this.uiFeedback.error('فشل إرسال الإيصال', err.error?.message || 'حدث خطأ أثناء إرسال الإيصال');
                    }
                });
            },
            error: (err) => {
                this.isLoading = false;
                this.uiFeedback.error('فشل التسجيل', err.error?.message || 'الفريق مسجل بالفعل في بطولة أخرى أو حدث خطأ');
            }
        });
    }

    goBack(): void {
        this.router.navigate(['/captain/championships']);
    }
}
