import { Component, OnInit, inject, signal, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ContextNavigationService } from '../../../../core/navigation/context-navigation.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TournamentService } from '../../../../core/services/tournament.service';
import { Tournament, TournamentStatus, TournamentFormat, TournamentLegType, SeedingMode, PaymentMethodConfig } from '../../../../core/models/tournament.model';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { FormControlComponent } from '../../../../shared/components/form-control/form-control.component';
import { LayoutOrchestratorService } from '../../../../core/services/layout-orchestrator.service';

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
    // ... (rest of injects same)
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly tournamentService = inject(TournamentService);
    private readonly uiFeedback = inject(UIFeedbackService);
    private readonly layoutOrchestrator = inject(LayoutOrchestratorService);
    private readonly navService = inject(ContextNavigationService);
    private readonly cdr = inject(ChangeDetectorRef);

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
        prizes: ['', [Validators.required]],
        format: [TournamentFormat.RoundRobin, [Validators.required]],
        matchType: [TournamentLegType.SingleLeg, [Validators.required]],
        isHomeAwayEnabled: [false],
        seedingMode: [SeedingMode.ShuffleOnly],
        numberOfGroups: [0],
        qualifiedTeamsPerGroup: [0],

        // Payment
        walletNumber: [''],
        walletLabel: ['محفظة إلكترونية'],
        instaPayNumber: [''],
        instaPayLabel: ['InstaPay']
    });

    formats = [
        { value: TournamentFormat.RoundRobin, label: 'دوري كامل (Round Robin)' },
        { value: TournamentFormat.GroupsThenKnockout, label: 'مجموعات ثم إقصائيات' },
        { value: TournamentFormat.KnockoutOnly, label: 'خروج المغلوب (Knockout)' },
        { value: TournamentFormat.GroupsWithHomeAwayKnockout, label: 'مجموعات + إقصائيات ذهاب وعودة' }
    ];

    matchTypes = [
        { value: TournamentLegType.SingleLeg, label: 'مباراة واحدة' },
        { value: TournamentLegType.HomeAndAway, label: 'ذهاب وعودة' }
    ];

    seedingModes = [
        { value: SeedingMode.ShuffleOnly, label: 'عشوائي بالكامل (Shuffle)' },
        { value: SeedingMode.Manual, label: 'يدوي (قريباً)' }, // Placeholder
        { value: SeedingMode.RankBased, label: 'حسب التصنيف' }
    ];

    ngOnInit(): void {
        this.setupValidators();
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.isEditMode.set(true);
            this.tournamentId.set(id);
            this.loadTournament(id);
        }
        this.updateLayout();
    }

    private setupValidators() {
        this.tournamentForm.get('format')?.valueChanges.subscribe(format => {
            const groupsControl = this.tournamentForm.get('numberOfGroups');
            const qualifiedControl = this.tournamentForm.get('qualifiedTeamsPerGroup');

            const needsGroups = (format === TournamentFormat.GroupsThenKnockout || format === TournamentFormat.GroupsWithHomeAwayKnockout);

            if (needsGroups) {
                groupsControl?.setValidators([Validators.required, Validators.min(1)]);
                qualifiedControl?.setValidators([Validators.required, Validators.min(1), Validators.max(3)]);
            } else {
                groupsControl?.clearValidators();
                qualifiedControl?.clearValidators();
            }
            groupsControl?.updateValueAndValidity();
            qualifiedControl?.updateValueAndValidity();
        });
    }

    // ... (updateLayout same)
    private updateLayout(): void {
        this.layoutOrchestrator.setTitle(this.isEditMode() ? 'تعديل البطولة' : 'إنشاء بطولة جديدة');
        this.layoutOrchestrator.setSubtitle(this.isEditMode() ? 'تحديث بيانات وقوانين البطولة' : 'قم بإدخال تفاصيل البطولة الجديدة لبدء التسجيل');
        this.layoutOrchestrator.setBackAction(() => this.cancel());
    }

    ngOnDestroy(): void {
        this.layoutOrchestrator.reset();
    }

    loadTournament(id: string): void {
        this.tournamentService.getTournamentById(id).subscribe({
            next: (tournament) => {
                if (tournament) {
                    // Parse Payment JSON if exists to fill legacy/new fields
                    let walletLabel = 'محفظة إلكترونية';
                    let instaLabel = 'InstaPay';

                    if (tournament.paymentMethodsJson) {
                        try {
                            const methods: PaymentMethodConfig[] = JSON.parse(tournament.paymentMethodsJson);
                            const wallet = methods.find(m => m.type === 'E_WALLET');
                            const insta = methods.find(m => m.type === 'INSTAPAY');
                            if (wallet) walletLabel = wallet.label;
                            if (insta) instaLabel = insta.label;
                        } catch (e) { console.error('Error parsing payment json', e); }
                    }

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
                        prizes: tournament.prizes,
                        format: tournament.format || TournamentFormat.RoundRobin,
                        matchType: tournament.matchType || TournamentLegType.SingleLeg,
                        isHomeAwayEnabled: tournament.isHomeAwayEnabled || false,
                        seedingMode: tournament.seedingMode || SeedingMode.ShuffleOnly,
                        numberOfGroups: tournament.numberOfGroups || 0,
                        qualifiedTeamsPerGroup: tournament.qualifiedTeamsPerGroup || 0,
                        walletNumber: tournament.walletNumber || '',
                        walletLabel: walletLabel,
                        instaPayNumber: tournament.instaPayNumber || '',
                        instaPayLabel: instaLabel
                    });

                    // Trigger validator updates
                    this.tournamentForm.get('format')?.updateValueAndValidity();
                    this.cdr.detectChanges();
                }
            },
            error: (err) => {
                this.uiFeedback.error('خطأ', 'فشل في تحميل بيانات البطولة');
                this.navService.navigateTo('tournaments');
            }
        });
    }

    private formatDate(date: any): string {
        if (!date) return '';
        const d = new Date(date);
        return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
    }

    onSubmit(): void {
        if (this.tournamentForm.invalid) {
            this.tournamentForm.markAllAsTouched();
            return;
        }

        this.isSubmitting.set(true);
        const formValue = this.tournamentForm.value;

        // Construct Payment JSON
        const paymentMethods: PaymentMethodConfig[] = [];
        if (formValue.walletNumber) {
            paymentMethods.push({ type: 'E_WALLET', label: formValue.walletLabel || 'محفظة', accountNumber: formValue.walletNumber });
        }
        if (formValue.instaPayNumber) {
            paymentMethods.push({ type: 'INSTAPAY', label: formValue.instaPayLabel || 'InstaPay', accountNumber: formValue.instaPayNumber });
        }

        const tournamentData: Partial<Tournament> = {
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
            format: formValue.format,
            matchType: formValue.matchType,
            numberOfGroups: formValue.numberOfGroups || 0,
            qualifiedTeamsPerGroup: formValue.qualifiedTeamsPerGroup || 0,
            walletNumber: formValue.walletNumber,
            instaPayNumber: formValue.instaPayNumber,
            isHomeAwayEnabled: formValue.isHomeAwayEnabled,
            seedingMode: formValue.seedingMode,
            paymentMethodsJson: JSON.stringify(paymentMethods)
        };

        if (this.isEditMode()) {
            this.tournamentService.updateTournament(this.tournamentId()!, tournamentData).subscribe({
                next: () => {
                    this.uiFeedback.success('تم التحديث', 'تم تحديث بيانات البطولة بنجاح');
                    this.navService.navigateTo(['tournaments', this.tournamentId()!]);
                },
                error: (err) => {
                    this.uiFeedback.error('خطأ', err.error?.message || 'فشل في تحديث البطولة');
                    this.isSubmitting.set(false);
                }
            });
        } else {
            // New tournaments start as DRAFT
            const newTournament = {
                ...tournamentData,
                status: TournamentStatus.DRAFT,
                currentTeams: 0,
                registrations: [],
                adminId: ''
            } as Omit<Tournament, 'id' | 'createdAt' | 'updatedAt'>;

            this.tournamentService.createTournament(newTournament).subscribe({
                next: () => {
                    this.uiFeedback.success('تم الإنشاء', 'تم إنشاء البطولة بنجاح');
                    this.navService.navigateTo('tournaments');
                },
                error: (err) => {
                    this.uiFeedback.error('خطأ', err.error?.message || 'فشل في إنشاء البطولة');
                    this.isSubmitting.set(false);
                }
            });
        }
    }

    cancel(): void {
        if (this.isEditMode()) {
            this.navService.navigateTo(['tournaments', this.tournamentId()!]);
        } else {
            this.navService.navigateTo('tournaments');
        }
    }
}
