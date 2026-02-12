import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TournamentService } from '../../../../core/services/tournament.service';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { LayoutOrchestratorService } from '../../../../core/services/layout-orchestrator.service';
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

    tournament = signal<Tournament | null>(null);
    registeredTeams = signal<TeamRegistration[]>([]);
    isLoading = signal(true);
    isSubmitting = signal(false);

    // Groups and their assigned teams
    unassignedTeams = signal<TeamRegistration[]>([]);
    groupAssignments = signal<{ id: number, name: string, teams: TeamRegistration[] }[]>([]);

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
                    this.router.navigate(['/tournaments']);
                    return;
                }
                this.tournament.set(t);
                this.setupLayout(t);
                this.loadRegistrations(id);
            },
            error: () => this.isLoading.set(false)
        });
    }

    setupLayout(t: Tournament): void {
        this.layoutOrchestrator.setTitle('إجراء القرعة يدوياً');
        this.layoutOrchestrator.setSubtitle(t.name);

        // Initialize groups based on tournament config
        const numGroups = t.numberOfGroups || 1;
        const initialGroups = [];
        for (let i = 1; i <= numGroups; i++) {
            initialGroups.push({ id: i, name: `المجموعة ${i}`, teams: [] });
        }
        this.groupAssignments.set(initialGroups);
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

    submitDraw(): void {
        const t = this.tournament();
        if (!t) return;

        if (this.unassignedTeams().length > 0) {
            this.uiFeedback.warning('تنبيه', 'يجب توزيع جميع الفرق على المجموعات أولاً.');
            return;
        }

        this.isSubmitting.set(true);

        const request: ManualDrawRequest = {
            groupAssignments: this.groupAssignments().map(g => ({
                groupId: g.id,
                teamIds: g.teams.map(team => team.teamId)
            }))
        };

        this.tournamentService.manualDraw(t.id, request).subscribe({
            next: () => {
                this.uiFeedback.success('تم بنجاح', 'تم إجراء القرعة وتوليد المباريات بنجاح.');
                this.router.navigate(['/tournaments', t.id]);
            },
            error: (err) => {
                this.isSubmitting.set(false);
                this.uiFeedback.error('خطأ', err.error?.message || 'فشل في حفظ القرعة');
            }
        });
    }

    cancel(): void {
        const t = this.tournament();
        if (t) {
            this.router.navigate(['/tournaments', t.id]);
        } else {
            this.router.navigate(['/tournaments']);
        }
    }
}
