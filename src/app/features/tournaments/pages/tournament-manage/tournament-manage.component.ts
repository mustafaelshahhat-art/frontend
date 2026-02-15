import { Component, OnInit, inject, signal, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ContextNavigationService } from '../../../../core/navigation/context-navigation.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TournamentService } from '../../../../core/services/tournament.service';
import { Tournament, TournamentStatus, TournamentFormat, TournamentLegType, TournamentMode, LateRegistrationMode, PaymentMethodConfig, SchedulingMode } from '../../../../core/models/tournament.model';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { FormControlComponent } from '../../../../shared/components/form-control/form-control.component';
import { SelectComponent } from '../../../../shared/components/select/select.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
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
        FormControlComponent,
        SelectComponent,
        IconComponent
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
        mode: [TournamentMode.LeagueSingle, [Validators.required]],
        numberOfGroups: [0],
        qualifiedTeamsPerGroup: [0],
        schedulingMode: [SchedulingMode.Random],

        // Payment
        walletNumber: [''],
        walletLabel: ['محفظة إلكترونية'],
        instaPayNumber: [''],
        instaPayLabel: ['InstaPay']
    });

    modes = [
        { value: TournamentMode.LeagueSingle, label: 'دوري كامل - مباراة واحدة', icon: 'settings' },
        { value: TournamentMode.LeagueHomeAway, label: 'دوري كامل - ذهاب وعودة', icon: 'sync' },
        { value: TournamentMode.GroupsKnockoutSingle, label: 'مجموعات ثم إقصائيات (مباراة واحدة)', icon: 'grid_view' },
        { value: TournamentMode.GroupsKnockoutHomeAway, label: 'مجموعات ثم إقصائيات (ذهاب وعودة)', icon: 'event_repeat' },
        { value: TournamentMode.KnockoutSingle, label: 'خروج المغلوب (مباراة واحدة)', icon: 'emoji_events' },
        { value: TournamentMode.KnockoutHomeAway, label: 'خروج المغلوب (ذهاب وعودة)', icon: 'sync' }
    ];

    schedulingModes = [
        { value: SchedulingMode.Random, label: 'توزيع عشوائي (اختيار اللقاء الافتتاحي)', icon: 'bolt' },
        { value: SchedulingMode.Manual, label: 'توزيع الفرق يدوياً (توليد مباريات تلقائي)', icon: 'groups' }
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
        this.tournamentForm.get('mode')?.valueChanges.subscribe(mode => {
            const groupsControl = this.tournamentForm.get('numberOfGroups');
            const schedulingControl = this.tournamentForm.get('schedulingMode');

            // League Modes (1 & 2): Always Random Scheduling
            if (mode === TournamentMode.LeagueSingle || mode === TournamentMode.LeagueHomeAway) {
                schedulingControl?.setValue(SchedulingMode.Random);
            }

            const needsGroups = (mode === TournamentMode.GroupsKnockoutSingle || mode === TournamentMode.GroupsKnockoutHomeAway);

            if (needsGroups) {
                groupsControl?.setValidators([Validators.required, Validators.min(1)]);
            } else {
                groupsControl?.clearValidators();
            }
            groupsControl?.updateValueAndValidity();
        });
    }

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
                        mode: tournament.mode || this.getEffectiveMode(tournament),
                        numberOfGroups: tournament.numberOfGroups || 0,
                        qualifiedTeamsPerGroup: tournament.qualifiedTeamsPerGroup || 0,
                        walletNumber: tournament.walletNumber || '',
                        walletLabel: walletLabel,
                        instaPayNumber: tournament.instaPayNumber || '',
                        instaPayLabel: instaLabel,
                        schedulingMode: tournament.schedulingMode ?? SchedulingMode.Random
                    });

                    this.tournamentForm.get('mode')?.updateValueAndValidity();
                    this.cdr.detectChanges();
                }
            },
            error: (err) => {
                this.uiFeedback.error('خطأ', 'فشل في تحميل بيانات البطولة');
                this.navService.navigateTo('tournaments');
            }
        });
    }

    private getEffectiveMode(t: Tournament): TournamentMode {
        if (t.format === TournamentFormat.GroupsThenKnockout) return TournamentMode.GroupsKnockoutSingle;
        if (t.format === TournamentFormat.GroupsWithHomeAwayKnockout) return TournamentMode.GroupsKnockoutHomeAway;
        if (t.format === TournamentFormat.KnockoutOnly) {
            return (t.matchType === TournamentLegType.HomeAndAway || t.isHomeAwayEnabled) ? TournamentMode.KnockoutHomeAway : TournamentMode.KnockoutSingle;
        }
        return (t.matchType === TournamentLegType.HomeAndAway || t.isHomeAwayEnabled) ? TournamentMode.LeagueHomeAway : TournamentMode.LeagueSingle;
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

        const formValue = this.tournamentForm.value;
        const start = new Date(formValue.startDate);
        const deadline = new Date(formValue.registrationDeadline);

        if (deadline > start) {
            this.uiFeedback.error('خطأ في التاريخ', 'آخر موعد للتسجيل لا يمكن أن يكون بعد تاريخ بداية البطولة');
            return;
        }

        this.isSubmitting.set(true);

        let format = TournamentFormat.RoundRobin;
        let matchType = TournamentLegType.SingleLeg;
        let isHomeAway = false;

        switch (formValue.mode) {
            case TournamentMode.LeagueSingle:
                format = TournamentFormat.RoundRobin;
                matchType = TournamentLegType.SingleLeg;
                isHomeAway = false;
                break;
            case TournamentMode.LeagueHomeAway:
                format = TournamentFormat.RoundRobin;
                matchType = TournamentLegType.HomeAndAway;
                isHomeAway = true;
                break;
            case TournamentMode.GroupsKnockoutSingle:
                format = TournamentFormat.GroupsThenKnockout;
                matchType = TournamentLegType.SingleLeg;
                isHomeAway = false;
                break;
            case TournamentMode.GroupsKnockoutHomeAway:
                format = TournamentFormat.GroupsWithHomeAwayKnockout;
                matchType = TournamentLegType.HomeAndAway;
                isHomeAway = true;
                break;
            case TournamentMode.KnockoutSingle:
                format = TournamentFormat.KnockoutOnly;
                matchType = TournamentLegType.SingleLeg;
                isHomeAway = false;
                break;
            case TournamentMode.KnockoutHomeAway:
                format = TournamentFormat.KnockoutOnly;
                matchType = TournamentLegType.HomeAndAway;
                isHomeAway = true;
                break;
        }

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
            startDate: start,
            endDate: new Date(formValue.endDate),
            registrationDeadline: deadline,
            maxTeams: formValue.maxTeams,
            location: formValue.location,
            entryFee: formValue.entryFee,
            rules: formValue.rules,
            prizes: formValue.prizes,
            mode: formValue.mode,
            format: format,
            matchType: matchType,
            isHomeAwayEnabled: isHomeAway,
            numberOfGroups: formValue.numberOfGroups || 0,
            qualifiedTeamsPerGroup: formValue.qualifiedTeamsPerGroup || 0,
            walletNumber: formValue.walletNumber,
            instaPayNumber: formValue.instaPayNumber,
            schedulingMode: formValue.schedulingMode,
            paymentMethodsJson: JSON.stringify(paymentMethods)
        };

        if (this.isEditMode()) {
            this.tournamentService.updateTournament(this.tournamentId()!, tournamentData).subscribe({
                next: () => {
                    this.uiFeedback.success('تم التحديث', 'تم تحديث بيانات البطولة بنجاح');
                    this.navService.navigateTo(['tournaments', this.tournamentId()!]);
                },
                error: () => {
                    this.isSubmitting.set(false);
                }
            });
        } else {
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
                error: () => {
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
