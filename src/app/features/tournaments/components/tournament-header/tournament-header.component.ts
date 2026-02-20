import { Component, ChangeDetectionStrategy, inject, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { TournamentDetailStore } from '../../stores/tournament-detail.store';
import { TournamentStatus } from '../../../../core/models/tournament.model';
import { getTournamentStatusLabel } from '../../utils/tournament-status.utils';

@Component({
    selector: 'app-tournament-header',
    standalone: true,
    imports: [CommonModule, IconComponent, BadgeComponent, CardComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './tournament-header.component.html',
    styleUrls: ['./tournament-header.component.scss']
})
export class TournamentHeaderComponent {
    readonly store = inject(TournamentDetailStore);

    TournamentStatus = TournamentStatus;

    get tournament() { return this.store.tournament; }
    get tournamentMatches() { return this.store.tournamentMatches; }

    getStatusLabel(status: TournamentStatus | undefined): string {
        return getTournamentStatusLabel(status);
    }

    getProgressPercent(): number {
        const t = this.tournament();
        if (!t?.maxTeams) return 0;
        return (t.currentTeams / t.maxTeams) * 100;
    }
}
