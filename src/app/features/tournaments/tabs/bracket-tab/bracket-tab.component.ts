import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TournamentDetailStore } from '../../stores/tournament-detail.store';
import { KnockoutBracketComponent } from '../../components/knockout-bracket/knockout-bracket.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

@Component({
    selector: 'app-bracket-tab',
    standalone: true,
    imports: [CommonModule, KnockoutBracketComponent, EmptyStateComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (store.liveBracket(); as b) {
            <app-knockout-bracket [rounds]="b.rounds"></app-knockout-bracket>
        } @else {
            <app-empty-state icon="account_tree" title="لا توجد بيانات"
                description="لم يتم إنشاء الأدوار الإقصائية بعد." />
        }
    `,
    styles: [`:host { display: block; }`]
})
export class BracketTabComponent {
    readonly store = inject(TournamentDetailStore);
}
