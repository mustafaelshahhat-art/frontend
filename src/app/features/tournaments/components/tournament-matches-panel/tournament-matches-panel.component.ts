import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TournamentDetailStore } from '../../stores/tournament-detail.store';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { MatchStatus } from '../../../../core/models/tournament.model';

@Component({
    selector: 'app-tournament-matches-panel',
    standalone: true,
    imports: [CommonModule, CardComponent, IconComponent, EmptyStateComponent, BadgeComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './tournament-matches-panel.component.html',
    styleUrls: ['./tournament-matches-panel.component.scss']
})
export class TournamentMatchesPanelComponent {
    readonly store = inject(TournamentDetailStore);
    MatchStatus = MatchStatus;

    get tournamentMatches() { return this.store.tournamentMatches; }
    get tournament() { return this.store.tournament; }

    getMatchStatusLabel(status: string): string {
        switch (status) {
            case 'Scheduled': return 'مجدولة';
            case 'Live': return 'مباشر';
            case 'Finished': return 'منتهية';
            case 'Postponed': return 'مؤجلة';
            case 'Cancelled': return 'ملغاة';
            default: return status;
        }
    }

    getMatchStatusType(status: string): 'primary' | 'live' | 'success' | 'warning' | 'danger' | 'muted' {
        switch (status) {
            case 'Scheduled': return 'primary';
            case 'Live': return 'live';
            case 'Finished': return 'success';
            case 'Postponed': return 'warning';
            case 'Cancelled': return 'danger';
            default: return 'muted';
        }
    }
}
