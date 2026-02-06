import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Match, MatchStatus } from '../../../core/models/tournament.model';
import { SmartImageComponent } from '../smart-image/smart-image.component';

@Component({
    selector: 'app-match-card',
    standalone: true,
    imports: [
        CommonModule,
        SmartImageComponent
    ],
    templateUrl: './match-card.component.html',
    styleUrls: ['./match-card.component.scss']
})
export class MatchCardComponent {
    @Input() match!: Match;
    @Input() title?: string;
    @Input() subtitle?: string;
    @Input() isClickable = false;

    @Output() cardClick = new EventEmitter<Match>();

    MatchStatus = MatchStatus;

    get isLive(): boolean {
        return this.match.status === MatchStatus.LIVE;
    }

    get isFinished(): boolean {
        return this.match.status === MatchStatus.FINISHED;
    }

    get isScheduled(): boolean {
        return this.match.status === MatchStatus.SCHEDULED;
    }

    get statusLabel(): string {
        if (this.isLive) return 'مباشر الآن';
        if (this.isFinished) return 'انتهت';
        return 'مباراة قادمة'; // Or specific date formatting if needed
    }

    onCardClick(): void {
        if (this.isClickable) {
            this.cardClick.emit(this.match);
        }
    }
}
