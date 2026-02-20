import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TournamentService } from '../../../../core/services/tournament.service';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { LayoutOrchestratorService } from '../../../../core/services/layout-orchestrator.service';
import { ContextNavigationService } from '../../../../core/navigation/context-navigation.service';
import { Tournament, TournamentStanding } from '../../../../core/models/tournament.model';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';

interface GroupSelection {
    groupId: number;
    groupName: string;
    standings: TournamentStanding[];
    selectedTeamIds: Set<string>;
}

@Component({
    selector: 'app-manual-qualification',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        ButtonComponent,
        CardComponent,
        IconComponent,
        BadgeComponent
    ],
    templateUrl: './manual-qualification.component.html',
    styleUrls: ['./manual-qualification.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManualQualificationComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private tournamentService = inject(TournamentService);
    private uiFeedback = inject(UIFeedbackService);
    private layoutOrchestrator = inject(LayoutOrchestratorService);
    private navService = inject(ContextNavigationService);

    tournament = signal<Tournament | null>(null);
    isLoading = signal(true);
    isSubmitting = signal(false);

    groupSelections = signal<GroupSelection[]>([]);

    totalSelected = computed(() => {
        return this.groupSelections().reduce((acc, g) => acc + g.selectedTeamIds.size, 0);
    });

    // We no longer have a fixed target count as per user request

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.loadTournament(id);
        }
    }

    async loadTournament(id: string): Promise<void> {
        this.isLoading.set(true);
        try {
            const t = await firstValueFrom(this.tournamentService.getTournamentById(id));
            if (!t) {
                this.uiFeedback.error('غير موجودة', 'البطولة غير موجودة.');
                return;
            }
            this.tournament.set(t);
            this.setupLayout(t);
            await this.loadStandings(id);
        } catch (err: any) {
            this.isLoading.set(false);
            this.uiFeedback.error('خطأ', 'فشل تحميل بيانات البطولة');
        }
    }

    setupLayout(t: Tournament): void {
        this.layoutOrchestrator.setTitle('تحديد المتأهلين للأدوار الإقصائية');
        this.layoutOrchestrator.setSubtitle(t.name);
    }

    async loadStandings(id: string): Promise<void> {
        try {
            const groups = await firstValueFrom(this.tournamentService.getGroups(id));
            const selections: GroupSelection[] = [];

            for (const group of groups) {
                const standings = await firstValueFrom(this.tournamentService.getStandings(id, group.id));
                selections.push({
                    groupId: group.id,
                    groupName: group.name,
                    standings: standings,
                    selectedTeamIds: new Set<string>()
                });
            }

            this.groupSelections.set(selections);
            this.isLoading.set(false);
        } catch (err: any) {
            this.isLoading.set(false);
            this.uiFeedback.error('خطأ', 'فشل تحميل المجموعات والترتيب');
        }
    }

    toggleSelection(groupIndex: number, teamId: string): void {
        if (this.isSubmitting()) return;

        const selections = [...this.groupSelections()];
        const group = selections[groupIndex];
        const newSelected = new Set(group.selectedTeamIds);

        if (newSelected.has(teamId)) {
            newSelected.delete(teamId);
        } else {
            newSelected.add(teamId);
        }

        selections[groupIndex] = { ...group, selectedTeamIds: newSelected };
        this.groupSelections.set(selections);
    }

    isSelected(groupIndex: number, teamId: string): boolean {
        return this.groupSelections()[groupIndex].selectedTeamIds.has(teamId);
    }

    async submit(): Promise<void> {
        const t = this.tournament();
        if (!t || this.isSubmitting()) return;

        if (this.totalSelected() === 0) {
            this.uiFeedback.warning('تنبيه', `يرجى اختيار فريق واحد على الأقل للمشاركة في الأدوار الإقصائية.`);
            return;
        }

        this.isSubmitting.set(true);

        const request = {
            selections: this.groupSelections().map(g => ({
                groupId: g.groupId,
                qualifiedTeamIds: Array.from(g.selectedTeamIds)
            }))
        };

        try {
            // We need to add this method to tournamentService
            await firstValueFrom((this.tournamentService as any).confirmManualQualification(t.id, request));
            this.uiFeedback.success('تم بنجاح', 'تم تحديد المتأهلين وتوليد الأدوار الإقصائية بنجاح.');
            this.layoutOrchestrator.reset();
            this.navService.navigateTo(['tournaments', t.id]);
        } catch (err: any) {
            this.isSubmitting.set(false);
            this.uiFeedback.error('فشل التأكيد', err.error?.message || 'تعذّر تأكيد المتأهلين.');
        }
    }

    cancel(): void {
        const t = this.tournament();
        this.layoutOrchestrator.reset();
        if (t) {
            this.navService.navigateTo(['tournaments', t.id]);
        } else {
            this.navService.navigateTo('tournaments');
        }
    }
}
