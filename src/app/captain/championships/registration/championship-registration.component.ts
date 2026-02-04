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

    private initForm(): void {
        this.regForm = this.fb.group({
            phone: ['', [Validators.required, Validators.pattern(/^05\d{8}$/)]],
            transferType: ['', Validators.required],
        });
    }

    private loadTournament(id: string): void {
        this.tournamentService.getTournaments().subscribe(list => {
            this.tournament = list.find(t => t.id === id) || null;
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

    onFileSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            this.selectedFileName = file.name;
        }
    }

    removeFile(): void {
        this.selectedFileName = null;
    }

    get isFormValid(): boolean {
        return this.regForm.valid && !!this.selectedFileName;
    }

    onSubmit(): void {
        if (this.isFormValid) {
            this.submitted = true;
            this.uiFeedback.success('تم الإرسال', 'تم إرسال طلب التسجيل بنجاح');
        }
    }

    goBack(): void {
        this.router.navigate(['/captain/championships']);
    }
}
