import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Match, MatchStatus } from '../../../core/models/tournament.model';
import { SmartImageComponent } from '../smart-image/smart-image.component';
import { resolveStatus, StatusConfig } from '../../utils/status-labels';

@Component({
    selector: 'app-match-card',
    standalone: true,
    imports: [
        CommonModule,
        SmartImageComponent
    ],
    templateUrl: './match-card.component.html',
    styleUrls: ['./match-card.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
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
        return this.match.status === MatchStatus.SCHEDULED ||
            this.match.status === MatchStatus.POSTPONED ||
            this.match.status === MatchStatus.RESCHEDULED;
    }

    get isCancelled(): boolean {
        return this.match.status === MatchStatus.CANCELLED;
    }

    get isPostponed(): boolean {
        return this.match.status === MatchStatus.POSTPONED;
    }

    get statusConfig(): StatusConfig {
        return resolveStatus('match', this.match.status);
    }

    onCardClick(): void {
        if (this.isClickable) {
            this.cardClick.emit(this.match);
        }
    }
}
