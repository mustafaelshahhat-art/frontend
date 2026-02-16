import { Component, Input, Output, EventEmitter, inject, OnChanges, SimpleChanges, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
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
    styleUrls: ['./match-event-modal.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
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
        description: ''
    };

    // Select Options
    eventTypeOptions: SelectOption[] = [
        { label: 'هدف', value: MatchEventType.GOAL, icon: 'sports_soccer' },
        { label: 'بطاقة صفراء', value: MatchEventType.YELLOW_CARD, icon: 'content_copy' },
        { label: 'بطاقة حمراء', value: MatchEventType.RED_CARD, icon: 'content_copy' },
        { label: 'ركلة جزاء', value: MatchEventType.PENALTY, icon: 'sports_soccer' }
    ];

    teamOptions: SelectOption[] = [];
    playerOptions: SelectOption[] = [];

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['match'] && this.match) {
            this.eventForm = {
                type: MatchEventType.GOAL,
                playerId: '',
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

    onTypeChange(type: MatchEventType): void {
        this.eventForm.type = type;
    }

    onTeamChange(teamId: string): void {
        this.eventForm.teamId = teamId;
        this.eventForm.playerId = '';
        this.loadTeamPlayers(teamId);
    }

    onPlayerChange(playerId: string): void {
        this.eventForm.playerId = playerId;
    }

    loadTeamPlayers(teamId: string): void {
        this.isPlayersLoading = true;
        this.playerOptions = [];
        this.teamService.getTeamById(teamId).subscribe(team => {
            // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
            // which can happen if the service returns synchronously
            queueMicrotask(() => {
                if (team && team.players) {
                    this.playerOptions = team.players.map((p: { name: string, id: string }) => ({
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
            this.uiFeedback.error('لاعب مطلوب', 'يرجى اختيار اللاعب المعني بالحدث.');
            return;
        }

        this.isSubmitting = true;
        this.matchService.addMatchEvent(this.match.id, {
            type: this.eventForm.type,
            playerId: this.eventForm.playerId,
            teamId: this.eventForm.teamId,
            description: this.eventForm.description,
            minute: 0 // Default for legacy/simple tracking if needed, or omit if API allows null
        }).subscribe({
            next: (updatedMatch) => {
                this.uiFeedback.success('تم الإضافة', 'تم إضافة الحدث');
                this.isSubmitting = false;
                this.eventAdded.emit(updatedMatch || undefined);
                this.close();
            },
            error: () => {
                this.uiFeedback.error('فشل الإضافة', 'تعذّر إضافة الحدث. يرجى المحاولة مرة أخرى.');
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
