import { Component, Input, Output, EventEmitter, inject, HostListener, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatchService } from '../../../core/services/match.service';
import { TeamService } from '../../../core/services/team.service';
import { UIFeedbackService } from '../../services/ui-feedback.service';
import { ModalComponent } from '../modal/modal.component';
import { ButtonComponent } from '../button/button.component';
import { Match, MatchEventType } from '../../../core/models/tournament.model';

@Component({
    selector: 'app-match-event-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent],
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
    activeDropdown: 'type' | 'team' | 'player' | null = null;
    teamPlayers: any[] = [];
    isPlayersLoading = false;
    isSubmitting = false;

    eventForm = {
        type: MatchEventType.GOAL,
        playerName: '',
        teamId: '',
        description: ''
    };

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['match'] && this.match) {
            this.eventForm = {
                type: MatchEventType.GOAL,
                playerName: '',
                teamId: this.match.homeTeamId,
                description: ''
            };
            this.loadTeamPlayers(this.match.homeTeamId);
        }
        if (changes['visible'] && this.visible && this.match) {
            this.activeDropdown = null;
        }
    }

    toggleDropdown(name: 'type' | 'team' | 'player', event?: Event): void {
        event?.stopPropagation();
        this.activeDropdown = this.activeDropdown === name ? null : name;
    }

    selectEventType(type: MatchEventType): void {
        this.eventForm.type = type;
        this.activeDropdown = null;
    }

    selectEventTeam(teamId: string): void {
        this.eventForm.teamId = teamId;
        this.eventForm.playerName = '';
        this.activeDropdown = null;
        this.loadTeamPlayers(teamId);
    }

    selectEventPlayer(player: any): void {
        this.eventForm.playerName = player.name;
        this.activeDropdown = null;
    }

    loadTeamPlayers(teamId: string): void {
        this.isPlayersLoading = true;
        this.teamService.getTeamById(teamId).subscribe(team => {
            this.teamPlayers = team ? team.players : [];
            this.isPlayersLoading = false;
        });
    }

    getEventIcon(type: MatchEventType | string): string {
        switch (type) {
            case MatchEventType.GOAL: return 'sports_soccer';
            case MatchEventType.YELLOW_CARD: return 'content_copy';
            case MatchEventType.RED_CARD: return 'content_copy';
            default: return 'info';
        }
    }

    getEventColor(type: MatchEventType | string): string {
        switch (type) {
            case MatchEventType.GOAL: return '#10B981';
            case MatchEventType.YELLOW_CARD: return '#F59E0B';
            case MatchEventType.RED_CARD: return '#EF4444';
            default: return '#64748b';
        }
    }

    getEventLabel(type: MatchEventType | string): string {
        switch (type) {
            case MatchEventType.GOAL: return 'هدف';
            case MatchEventType.YELLOW_CARD: return 'بطاقة صفراء';
            case MatchEventType.RED_CARD: return 'بطاقة حمراء';
            default: return 'حدث';
        }
    }

    submit(): void {
        const selectedPlayerName = typeof this.eventForm.playerName === 'string'
            ? this.eventForm.playerName
            : (this.eventForm.playerName as any)?.name;

        if (!this.match || !selectedPlayerName) {
            this.uiFeedback.error('خطأ', 'يرجى اختيار اللاعب');
            return;
        }

        this.isSubmitting = true;
        this.matchService.addMatchEvent(this.match.id, {
            type: this.eventForm.type,
            playerName: selectedPlayerName,
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
        this.activeDropdown = null;
    }

    @HostListener('document:click')
    onDocumentClick(): void {
        this.activeDropdown = null;
    }
}
