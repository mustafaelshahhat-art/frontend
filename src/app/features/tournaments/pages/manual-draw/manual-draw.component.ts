import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TournamentService } from '../../../../core/services/tournament.service';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { LayoutOrchestratorService } from '../../../../core/services/layout-orchestrator.service';
import { ContextNavigationService } from '../../../../core/navigation/context-navigation.service';
import { Tournament, TeamRegistration, TournamentMode, GroupAssignment, ManualDrawRequest } from '../../../../core/models/tournament.model';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { SmartImageComponent } from '../../../../shared/components/smart-image/smart-image.component';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { IconComponent } from '../../../../shared/components/icon/icon.component';

@Component({
    selector: 'app-manual-draw',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        ButtonComponent,
        CardComponent,
        SmartImageComponent,
        DragDropModule,
        IconComponent
    ],
    templateUrl: './manual-draw.component.html',
    styleUrls: ['./manual-draw.component.scss']
})
export class ManualDrawComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private tournamentService = inject(TournamentService);
    private uiFeedback = inject(UIFeedbackService);
    private layoutOrchestrator = inject(LayoutOrchestratorService);
    private navService = inject(ContextNavigationService);

    tournament = signal<Tournament | null>(null);
    registeredTeams = signal<TeamRegistration[]>([]);
    isLoading = signal(true);
    isSubmitting = signal(false);

    // Groups and their assigned teams
    unassignedTeams = signal<TeamRegistration[]>([]);
    groupAssignments = signal<{ id: number, name: string, teams: TeamRegistration[] }[]>([]);

    // Knockout Specific
    knockoutPairings = signal<{ home: TeamRegistration | null, away: TeamRegistration | null }[]>([]);
    homeToPair = signal<TeamRegistration | null>(null);
    awayToPair = signal<TeamRegistration | null>(null);

    isKnockout = computed(() => {
        const t = this.tournament();
        if (!t) return false;
        return t.format === 'KnockoutOnly' || t.format === 'KnockoutHomeAway';
    });

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.loadTournament(id);
        }
    }

    loadTournament(id: string): void {
        this.isLoading.set(true);
        this.tournamentService.getTournamentById(id).subscribe({
            next: (t) => {
                if (!t) {
                    this.uiFeedback.error('خطأ', 'البطولة غير موجودة');
                    return;
                }
                this.tournament.set(t);
                this.setupLayout(t);
                this.loadRegistrations(id);
            },
            error: (err) => {
                this.isLoading.set(false);
                this.uiFeedback.error('خطأ في تحميل البطولة', err.error?.message || 'فشل في تحميل بيانات البطولة');
            }
        });
    }

    setupLayout(t: Tournament): void {
        this.layoutOrchestrator.setTitle('إجراء القرعة يدوياً');
        this.layoutOrchestrator.setSubtitle(t.name);

        if (t.format === 'GroupsThenKnockout' || t.format === 'GroupsWithHomeAwayKnockout' || t.format === 'RoundRobin') {
            const numGroups = t.numberOfGroups || 1;
            const initialGroups = [];
            for (let i = 1; i <= numGroups; i++) {
                initialGroups.push({ id: i, name: `المجموعة ${i}`, teams: [] });
            }
            this.groupAssignments.set(initialGroups);
        } else {
            // Knockout setup
            this.knockoutPairings.set([]);
            this.homeToPair.set(null);
            this.awayToPair.set(null);
        }
    }

    loadRegistrations(id: string): void {
        this.tournamentService.getRegistrations(id).subscribe({
            next: (regs) => {
                const approved = regs.filter(r => r.status === 'Approved');
                this.registeredTeams.set(approved);
                this.unassignedTeams.set([...approved]);
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
        });
    }

    drop(event: CdkDragDrop<TeamRegistration[]>): void {
        if (event.previousContainer === event.container) {
            moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
        } else {
            transferArrayItem(
                event.previousContainer.data,
                event.container.data,
                event.previousIndex,
                event.currentIndex
            );
        }
    }

    onTeamDropped(event: CdkDragDrop<any>, slot: 'home' | 'away'): void {
        const team = event.item.data as TeamRegistration;

        if (slot === 'home') {
            if (this.homeToPair()) {
                this.unassignedTeams.update(teams => [...teams, this.homeToPair()!]);
            }
            this.homeToPair.set(team);
        } else {
            if (this.awayToPair()) {
                this.unassignedTeams.update(teams => [...teams, this.awayToPair()!]);
            }
            this.awayToPair.set(team);
        }

        // Remove from source
        this.unassignedTeams.update(teams => teams.filter(t => t.teamId !== team.teamId));

        // If both filled, pair them
        if (this.homeToPair() && this.awayToPair()) {
            this.addPairing(this.homeToPair()!, this.awayToPair()!);
            this.homeToPair.set(null);
            this.awayToPair.set(null);
        }
    }

    addPairing(home: TeamRegistration, away: TeamRegistration): void {
        this.knockoutPairings.update(p => [...p, { home, away }]);
    }

    removePairing(index: number): void {
        const pairing = this.knockoutPairings()[index];
        if (pairing.home) this.unassignedTeams.update(teams => [...teams, pairing.home!]);
        if (pairing.away) this.unassignedTeams.update(teams => [...teams, pairing.away!]);
        this.knockoutPairings.update(p => p.filter((_, i) => i !== index));
    }

    submitDraw(): void {
        const t = this.tournament();
        if (!t) return;

        if (this.unassignedTeams().length > 0) {
            this.uiFeedback.warning('تنبيه', 'يجب توزيع جميع الفرق أولاً.');
            return;
        }

        this.isSubmitting.set(true);

        if (this.isKnockout()) {
            this.submitKnockoutDraw(t);
        } else {
            this.submitGroupDraw(t);
        }
    }

    private submitGroupDraw(t: Tournament): void {
        const assignments = this.groupAssignments().map(g => ({
            groupId: g.id,
            teamIds: g.teams.map(team => team.teamId)
        }));

        this.tournamentService.assignGroups(t.id, assignments).subscribe({
            next: () => {
                // Now generate matches
                this.tournamentService.generateManualGroupMatches(t.id).subscribe({
                    next: () => {
                        this.uiFeedback.success('تم بنجاح', 'تم توزيع الفرق وتوليد مباريات المجموعات بنجاح.');
                        // Navigate back to tournament detail using context-aware navigation
                        this.layoutOrchestrator.reset();
                        this.navService.navigateTo(['tournaments', t.id]);
                    },
                    error: (err) => {
                        this.isSubmitting.set(false);
                        this.uiFeedback.error('خطأ في توليد المباريات', err.error?.message || 'فشل توليد المواجهات');
                    }
                });
            },
            error: (err) => {
                this.isSubmitting.set(false);
                this.uiFeedback.error('خطأ في التوزيع', err.error?.message || 'فشل في حفظ المجموعات');
            }
        });
    }

    private submitKnockoutDraw(t: Tournament): void {
        const pairings = this.knockoutPairings().map(p => ({
            homeTeamId: p.home?.teamId,
            awayTeamId: p.away?.teamId,
            roundNumber: 1,
            stageName: 'Round 1'
        }));

        this.tournamentService.createManualKnockoutMatches(t.id, pairings).subscribe({
            next: () => {
                this.uiFeedback.success('تم بنجاح', 'تم إنشاء مواجهات خروج المغلوب بنجاح.');
                // Navigate back to tournament detail using context-aware navigation
                this.layoutOrchestrator.reset();
                this.navService.navigateTo(['tournaments', t.id]);
            },
            error: (err) => {
                this.isSubmitting.set(false);
                this.uiFeedback.error('خطأ', err.error?.message || 'فشل في إنشاء المواجهات');
            }
        });
    }

    cancel(): void {
        const t = this.tournament();
        if (t) {
            this.layoutOrchestrator.reset();
            this.navService.navigateTo(['tournaments', t.id]);
        } else {
            this.layoutOrchestrator.reset();
            this.navService.navigateTo('tournaments');
        }
    }
}
