import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TournamentDetailStore } from '../../stores/tournament-detail.store';
import { MatchCardComponent } from '../../../../shared/components/match-card/match-card.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { MatchStatus } from '../../../../core/models/tournament.model';
import { Permission } from '../../../../core/permissions/permissions.model';
import { ContextNavigationService } from '../../../../core/navigation/context-navigation.service';

@Component({
    selector: 'app-matches-tab',
    standalone: true,
    imports: [CommonModule, MatchCardComponent, ButtonComponent, IconComponent, EmptyStateComponent, HasPermissionDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (store.tournamentMatches().length > 0) {
        <div class="matches-grid">
            @for (match of store.tournamentMatches(); track match.id) {
            <app-match-card (click)="viewMatch(match.id)" class="clickable-match-card" [match]="match">
                <div class="match-card-actions" actions>
                    <app-button *appHasPermission="Permission.MANAGE_MATCHES"
                        (click)="$event.stopPropagation(); viewMatch(match.id)" size="sm" variant="outline"
                        icon="scoreboard">
                        تحديث النتيجة
                    </app-button>

                    <div class="player-actions">
                        <button class="action-btn details-btn items-center justify-center"
                            (click)="$event.stopPropagation(); viewMatch(match.id)">
                            <app-icon name="info" class="icon-sm"></app-icon>
                            <span>التفاصيل</span>
                        </button>

                        @if (match.status !== MatchStatus.FINISHED && match.status !== MatchStatus.CANCELLED) {
                        <button class="action-btn chat-btn items-center justify-center"
                            [class.chat-live]="match.status === MatchStatus.LIVE"
                            (click)="$event.stopPropagation(); openChat(match.id)">
                            <app-icon [name]="match.status === MatchStatus.LIVE ? 'forum' : 'chat'" class="icon-sm"></app-icon>
                            <span>{{ match.status === MatchStatus.LIVE ? 'المحادثة المباشرة' : 'المحادثة' }}</span>
                        </button>
                        }
                    </div>
                </div>
            </app-match-card>
            }
        </div>
        } @else {
        <app-empty-state icon="event_busy" title="لا توجد مباريات"
            description="لم يتم جدولة أي مباريات لهذه البطولة حتى الآن." />
        }
    `,
    styles: [`
        :host { display: block; }

        .matches-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
            gap: var(--space-4);

            @media (max-width: 768px) {
                grid-template-columns: 1fr;
            }
        }

        .clickable-match-card { cursor: pointer; }

        .match-card-actions {
            display: flex;
            flex-direction: column;
            gap: var(--space-2);
        }

        .player-actions {
            display: flex;
            gap: var(--space-2);
        }

        .action-btn {
            display: flex;
            align-items: center;
            gap: var(--space-1);
            padding: var(--space-2) var(--space-3);
            border-radius: var(--radius-lg);
            border: 1px solid var(--border-color);
            background: transparent;
            cursor: pointer;
            font-size: var(--text-sm);
            color: var(--text-primary);
            transition: all 0.2s;

            &:hover { background: var(--bg-hover); }

            &.chat-live {
                border-color: var(--danger-color);
                color: var(--danger-color);
                animation: pulse-subtle 2s infinite;
            }
        }

        @keyframes pulse-subtle {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
    `]
})
export class MatchesTabComponent {
    readonly store = inject(TournamentDetailStore);
    private navService = inject(ContextNavigationService);

    Permission = Permission;
    MatchStatus = MatchStatus;

    viewMatch(matchId: string): void {
        this.navService.navigateTo(['matches', matchId]);
    }

    openChat(matchId: string): void {
        this.navService.navigateTo(['matches', matchId, 'chat']);
    }
}
