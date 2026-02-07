import { Component, Input, Output, EventEmitter, inject, HostListener, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatchService } from '../../../../core/services/match.service';
import { TeamService } from '../../../../core/services/team.service';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { SelectComponent, SelectOption } from '../../../../shared/components/select/select.component';
import { Match, MatchEventType } from '../../../../core/models/tournament.model';

@Component({
    selector: 'app-match-event-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent, SelectComponent],
    templateUrl: './match-event-modal.component.html',
    styleUrls: ['./match-event-modal.component.scss']
})
export class MatchEventModalComponent implements OnChanges {
    private matchService = inject(MatchService);
    private teamService = inject(TeamService);
    private uiFeedback = inject(UIFeedbackService);

    @Input() match: Match | null = null;
    @Input() visible = false;

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() eventAdded = new EventEmitter<Match>();

    MatchEventType = MatchEventType;

    // Dropdown State
    isPlayersLoading = false;
    isSubmitting = false;

    eventForm = {
        type: MatchEventType.GOAL,
        playerName: '', // This will hold the player object or name from select
        teamId: '',
        description: ''
    };

    // Select Options
    eventTypeOptions: SelectOption[] = [
        { label: 'هدف', value: MatchEventType.GOAL, icon: 'sports_soccer' },
        { label: 'بطاقة صفراء', value: MatchEventType.YELLOW_CARD, icon: 'content_copy' }, // Style handling needed? select handles icons only
        { label: 'بطاقة حمراء', value: MatchEventType.RED_CARD, icon: 'content_copy' }
    ];

    teamOptions: SelectOption[] = [];
    playerOptions: SelectOption[] = [];

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['match'] && this.match) {
            this.eventForm = {
                type: MatchEventType.GOAL,
                playerName: '',
                teamId: this.match.homeTeamId,
                description: ''
            };

            this.teamOptions = [
                { label: this.match.homeTeamName, value: this.match.homeTeamId },
                { label: this.match.awayTeamName, value: this.match.awayTeamId }
            ];

            this.loadTeamPlayers(this.match.homeTeamId);
        }
    }

    onTypeChange(type: any): void {
        this.eventForm.type = type;
    }

    onTeamChange(teamId: any): void {
        this.eventForm.teamId = teamId;
        this.eventForm.playerName = '';
        this.loadTeamPlayers(teamId);
    }

    onPlayerChange(player: any): void {
        this.eventForm.playerName = player; // Select stores value, here value is player object or name
    }

    loadTeamPlayers(teamId: string): void {
        this.isPlayersLoading = true;
        this.playerOptions = []; // Clear current
        this.teamService.getTeamById(teamId).subscribe(team => {
            if (team && team.players) {
                this.playerOptions = team.players.map((p: any) => ({
                    label: `${p.name} (#${p.displayId?.split('-')[1] || '?'})`,
                    value: p.name, // We only need name for backend currently
                    icon: 'person'
                }));
            }
            this.isPlayersLoading = false;
        });
    }

    submit(): void {
        if (!this.match || !this.eventForm.playerName) {
            this.uiFeedback.error('خطأ', 'يرجى اختيار اللاعب');
            return;
        }

        this.isSubmitting = true;
        this.matchService.addMatchEvent(this.match.id, {
            type: this.eventForm.type,
            playerName: this.eventForm.playerName,
            teamId: this.eventForm.teamId,
            description: this.eventForm.description
        }).subscribe({
            next: (updatedMatch) => {
                this.uiFeedback.success('تم الإضافة', 'تم إضافة الحدث');
                this.isSubmitting = false;
                this.eventAdded.emit(updatedMatch || undefined);
                this.close();
            },
            error: () => {
                this.uiFeedback.error('خطأ', 'فشل في إضافة الحدث');
                this.isSubmitting = false;
            }
        });
    }

    cancel(): void {
        if (this.isSubmitting) return;
        this.close();
    }

    close(): void {
        this.visible = false;
        this.visibleChange.emit(false);
    }
}
