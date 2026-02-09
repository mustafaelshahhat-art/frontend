import { Component, OnInit, inject, signal, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TournamentService } from '../../../../core/services/tournament.service';
import { Tournament, TournamentStatus } from '../../../../core/models/tournament.model';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { FormControlComponent } from '../../../../shared/components/form-control/form-control.component';
import { AdminLayoutService } from '../../../../core/services/admin-layout.service';

@Component({
    selector: 'app-tournament-manage',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
        ButtonComponent,
        CardComponent,
        FormControlComponent
    ],
    templateUrl: './tournament-manage.component.html',
    styleUrls: ['./tournament-manage.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TournamentManageComponent implements OnInit, OnDestroy {
    private readonly fb = inject(FormBuilder);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly tournamentService = inject(TournamentService);
    private readonly uiFeedback = inject(UIFeedbackService);
    private readonly adminLayout = inject(AdminLayoutService);

    isEditMode = signal(false);
    tournamentId = signal<string | null>(null);
    isSubmitting = signal(false);

    tournamentForm: FormGroup = this.fb.group({
        name: ['', [Validators.required, Validators.minLength(5)]],
        description: ['', [Validators.required]],
        startDate: ['', [Validators.required]],
        endDate: ['', [Validators.required]],
        registrationDeadline: ['', [Validators.required]],
        maxTeams: [16, [Validators.required, Validators.min(2)]],
        location: ['', [Validators.required]],
        entryFee: [0, [Validators.required, Validators.min(0)]],
        rules: ['', [Validators.required]],
        prizes: ['', [Validators.required]]
    });

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.isEditMode.set(true);
            this.tournamentId.set(id);
            this.loadTournament(id);
        }
        this.updateLayout();
    }

    private updateLayout(): void {
        this.adminLayout.setTitle(this.isEditMode() ? 'تعديل البطولة' : 'إنشاء بطولة جديدة');
        this.adminLayout.setSubtitle(this.isEditMode() ? 'تحديث بيانات وقوانين البطولة' : 'قم بإدخال تفاصيل البطولة الجديدة لبدء التسجيل');
        this.adminLayout.setBackAction(() => this.cancel());
    }

    ngOnDestroy(): void {
        this.adminLayout.reset();
    }

    loadTournament(id: string): void {
        this.tournamentService.getTournamentById(id).subscribe(tournament => {
            if (tournament) {
                this.tournamentForm.patchValue({
                    name: tournament.name,
                    description: tournament.description,
                    startDate: this.formatDate(tournament.startDate),
                    endDate: this.formatDate(tournament.endDate),
                    registrationDeadline: this.formatDate(tournament.registrationDeadline),
                    maxTeams: tournament.maxTeams,
                    location: tournament.location,
                    entryFee: tournament.entryFee,
                    rules: tournament.rules,
                    prizes: tournament.prizes
                });
            }
        });
    }

    private formatDate(date: Date): string {
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    }

    onSubmit(): void {
        if (this.tournamentForm.invalid) {
            this.tournamentForm.markAllAsTouched();
            return;
        }

        this.isSubmitting.set(true);
        const formValue = this.tournamentForm.value;
        const tournamentData: Omit<Tournament, 'id' | 'createdAt' | 'updatedAt'> = {
            name: formValue.name,
            description: formValue.description,
            startDate: new Date(formValue.startDate),
            endDate: new Date(formValue.endDate),
            registrationDeadline: new Date(formValue.registrationDeadline),
            maxTeams: formValue.maxTeams,
            location: formValue.location,
            entryFee: formValue.entryFee,
            rules: formValue.rules,
            prizes: formValue.prizes,
            status: TournamentStatus.DRAFT, // Default for new, will be ignored/overridden by backend if updating
            currentTeams: 0,
            registrations: [],
            adminId: '' // Will be set by backend from auth context
        };

        if (this.isEditMode()) {
            this.tournamentService.updateTournament(this.tournamentId()!, tournamentData).subscribe({
                next: () => {
                    this.uiFeedback.success('تم التحديث', 'تم تحديث بيانات البطولة بنجاح');
                    this.router.navigate(['/admin/tournaments', this.tournamentId()]);
                },
                error: () => this.isSubmitting.set(false)
            });
        } else {
            this.tournamentService.createTournament(tournamentData).subscribe({
                next: () => {
                    this.uiFeedback.success('تم الإنشاء', 'تم إنشاء البطولة بنجاح');
                    this.router.navigate(['/admin/tournaments']);
                },
                error: () => this.isSubmitting.set(false)
            });
        }
    }

    cancel(): void {
        if (this.isEditMode()) {
            this.router.navigate(['/admin/tournaments', this.tournamentId()]);
        } else {
            this.router.navigate(['/admin/tournaments']);
        }
    }
}
