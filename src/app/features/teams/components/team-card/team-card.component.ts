import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { Team, MIN_PLAYERS_FOR_COMPLETE } from '../../../../core/models/team.model';

@Component({
    selector: 'app-team-card',
    standalone: true,
    imports: [CommonModule, IconComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './team-card.component.html',
    styleUrls: ['./team-card.component.scss']
})
export class TeamCardComponent {
    @Input({ required: true }) team!: Team;
    @Input() variant: 'owned' | 'member' = 'owned';

    @Output() cardClick = new EventEmitter<string>();

    get roleLabel(): string {
        return this.variant === 'owned' ? 'فريق مملوك' : 'عضو في الفريق';
    }

    get isReady(): boolean {
        return this.team.isComplete ?? (this.team.playerCount || 0) >= MIN_PLAYERS_FOR_COMPLETE;
    }

    get statusLabel(): string {
        return this.isReady ? 'فريق مكتمل' : 'فريق غير مكتمل';
    }

    onCardClick(): void {
        this.cardClick.emit(this.team.id);
    }
}
