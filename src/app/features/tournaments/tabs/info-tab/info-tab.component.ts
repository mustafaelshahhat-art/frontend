import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TournamentDetailStore } from '../../stores/tournament-detail.store';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { MatchEventType, Match, MatchStatus } from '../../../../core/models/tournament.model';

@Component({
    selector: 'app-info-tab',
    standalone: true,
    imports: [CommonModule, CardComponent, IconComponent, EmptyStateComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (store.tournament(); as t) {
        <div class="info-grid">
            <app-card class="scorers-card">
                <div class="card-header-premium">
                    <app-icon name="star" class="icon-sm"></app-icon>
                    <h3>هدافو البطولة</h3>
                </div>
                <div class="scorers-list">
                    @for (s of scorers(); track s.teamId; let i = $index) {
                    <div class="scorer-item">
                        <span class="rank">{{ i + 1 }}</span>
                        <div class="info items-start">
                            <span class="name">{{ s.name }}</span>
                            <span class="team">{{ s.team }}</span>
                        </div>
                        <div class="goals-badge">
                            <span class="value">{{ s.goals }}</span>
                            <span class="label">أهداف</span>
                        </div>
                    </div>
                    } @empty {
                    <app-empty-state icon="sports_soccer" title="لا يوجد هدافين"
                        description="لم يتم تسجيل أي أهداف في هذه البطولة حتى الآن." />
                    }
                </div>
            </app-card>

            <app-card class="rules-card">
                <div class="card-header-premium">
                    <app-icon name="gavel" class="icon-sm"></app-icon>
                    <h3>قواعد البطولة</h3>
                </div>
                <div class="rules-list">
                    @for (rule of rulesList(); track rule) {
                    <div class="rule-item">
                        <app-icon name="check_circle" class="check icon-sm"></app-icon>
                        <p>{{ rule }}</p>
                    </div>
                    } @empty {
                    <app-empty-state icon="gavel" title="لا يوجد قواعد"
                        description="لم يتم تحدد قواعد خاصة لهذه البطولة بعد." />
                    }
                </div>
            </app-card>

            <app-card class="prizes-card">
                <div class="card-header-premium">
                    <app-icon name="workspace_premium" class="icon-sm"></app-icon>
                    <h3>جوائز البطولة</h3>
                </div>
                <div class="prizes-content">
                    @if (t.prizes) {
                    <p class="prizes-text">{{ t.prizes }}</p>
                    } @else {
                    <app-empty-state icon="military_tech" title="لا يوجد جوائز"
                        description="لم يتم تحديد الجوائز لهذه البطولة بعد." />
                    }
                </div>
            </app-card>
        </div>
        }
    `,
    styles: [`
        :host { display: block; }

        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: var(--space-6);
        }

        .card-header-premium {
            display: flex;
            align-items: center;
            gap: var(--space-3);
            margin-bottom: var(--space-6);
            padding-bottom: var(--space-4);
            border-bottom: 1px solid var(--border-color);

            h3 {
                font-size: var(--text-lg);
                font-weight: var(--font-bold);
                margin: 0;
                color: var(--text-primary);
                letter-spacing: var(--tracking-tight);
            }
        }

        .scorers-list {
            display: flex;
            flex-direction: column;
            gap: var(--space-3);
        }

        .scorer-item {
            display: flex;
            align-items: center;
            gap: var(--space-3);
            padding: var(--space-3);
            border-radius: var(--radius-lg);
            transition: background 0.2s;

            &:hover { background: var(--bg-hover); }

            .rank {
                font-size: var(--text-lg);
                font-weight: var(--font-bold);
                color: var(--primary-color);
                min-width: 28px;
                text-align: center;
            }

            .info {
                flex: 1;
                display: flex;
                flex-direction: column;

                .name { font-weight: var(--font-semibold); color: var(--text-primary); }
                .team { font-size: var(--text-sm); color: var(--text-secondary); }
            }

            .goals-badge {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: var(--space-2) var(--space-3);
                border-radius: var(--radius-lg);
                background: var(--primary-color-tint);

                .value { font-weight: var(--font-bold); font-size: var(--text-lg); color: var(--primary-color); }
                .label { font-size: var(--text-xs); color: var(--text-secondary); }
            }
        }

        .rules-list {
            display: flex;
            flex-direction: column;
            gap: var(--space-3);
        }

        .rule-item {
            display: flex;
            gap: var(--space-3);
            align-items: flex-start;

            .check { color: var(--success-color); flex-shrink: 0; }
            p { margin: 0; color: var(--text-primary); line-height: 1.6; }
        }

        .prizes-text {
            color: var(--text-primary);
            line-height: 1.8;
            white-space: pre-line;
        }
    `]
})
export class InfoTabComponent {
    readonly store = inject(TournamentDetailStore);

    readonly rulesList = computed(() => {
        const rules = this.store.tournament()?.rules;
        return rules ? rules.split('\n').filter((r: string) => r.trim().length > 0) : [];
    });

    readonly scorers = computed(() => {
        const matches = this.store.tournamentMatches();
        const scorerMap = new Map<string, { name: string; team: string; goals: number; teamId: string }>();
        const seenEventIds = new Set<string>();

        matches.forEach((m: Match) => {
            // Events are the single source of truth for goals (m.goals is deprecated and never populated by the API)
            const goalEvents = (m.events || [])
                .filter(e => (e.type as unknown) === 'Goal' || e.type === MatchEventType.GOAL);

            goalEvents.forEach(e => {
                // Deduplicate by event ID only (not by playerId+minute) to correctly count multiple goals by the same player
                if (!e.playerId || (e.id && seenEventIds.has(e.id))) return;
                if (e.id) seenEventIds.add(e.id);

                const key = e.playerId;
                if (!scorerMap.has(key)) {
                    scorerMap.set(key, {
                        name: e.playerName || 'لاعب مجهول',
                        team: m.homeTeamId === e.teamId ? m.homeTeamName : m.awayTeamName,
                        goals: 0,
                        teamId: e.teamId
                    });
                }
                scorerMap.get(key)!.goals++;
            });
        });

        return Array.from(scorerMap.values())
            .sort((a, b) => b.goals - a.goals)
            .slice(0, 10);
    });
}
