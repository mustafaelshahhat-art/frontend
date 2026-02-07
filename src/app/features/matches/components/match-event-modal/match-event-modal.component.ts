import { Component, Input, Output, EventEmitter, inject, HostListener, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
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
    private cdr = inject(ChangeDetectorRef);

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
        playerId: '',
        teamId: '',
        description: '',
        minute: 0
    };

    // Select Options
    eventTypeOptions: SelectOption[] = [
        { label: 'هدف', value: MatchEventType.GOAL, icon: 'sports_soccer' },
        { label: 'بطاقة صفراء', value: MatchEventType.YELLOW_CARD, icon: 'content_copy' },
        { label: 'بطاقة حمراء', value: MatchEventType.RED_CARD, icon: 'content_copy' },
        { label: 'ركلة جزاء', value: MatchEventType.PENALTY, icon: 'sports_soccer' },
        { label: 'هدف في مرماه', value: MatchEventType.OWN_GOAL, icon: 'block' }
    ];

    teamOptions: SelectOption[] = [];
    playerOptions: SelectOption[] = [];

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['match'] && this.match) {
            this.eventForm = {
                type: MatchEventType.GOAL,
                playerId: '',
                teamId: this.match.homeTeamId,
                description: '',
                minute: 0
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
        this.eventForm.playerId = '';
        this.loadTeamPlayers(teamId);
    }

    onPlayerChange(playerId: any): void {
        this.eventForm.playerId = playerId;
    }

    loadTeamPlayers(teamId: string): void {
        this.isPlayersLoading = true;
        this.playerOptions = [];
        this.teamService.getTeamById(teamId).subscribe(team => {
            // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
            // which can happen if the service returns synchronously
            setTimeout(() => {
                if (team && team.players) {
                    this.playerOptions = team.players.map((p: any) => ({
                        label: p.name,
                        value: p.id,
                        icon: 'person'
                    }));
                } else {
                    this.playerOptions = [];
                }
                this.isPlayersLoading = false;
                this.cdr.markForCheck();
            });
        });
    }

    submit(): void {
        if (!this.match || !this.eventForm.playerId) {
            this.uiFeedback.error('خطأ', 'يرجى اختيار اللاعب');
            return;
        }

        this.isSubmitting = true;
        this.matchService.addMatchEvent(this.match.id, {
            type: this.eventForm.type,
            playerId: this.eventForm.playerId,
            teamId: this.eventForm.teamId,
            description: this.eventForm.description,
            minute: this.eventForm.minute
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
