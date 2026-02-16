import {
    Component, ChangeDetectionStrategy, inject, computed,
    ViewChild, TemplateRef, AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TournamentDetailStore } from '../../stores/tournament-detail.store';
import { FilterComponent } from '../../../../shared/components/filter/filter.component';
import { TableComponent, TableColumn } from '../../../../shared/components/table/table.component';
import { SmartImageComponent } from '../../../../shared/components/smart-image/smart-image.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { TournamentStatus } from '../../../../core/models/tournament.model';

@Component({
    selector: 'app-standings-tab',
    standalone: true,
    imports: [CommonModule, FilterComponent, TableComponent, SmartImageComponent, BadgeComponent, IconComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (store.tournament(); as t) {
        <div class="standings-wrapper">
            @if (store.groups().length > 0) {
            <app-filter [items]="store.groups()" [activeValue]="store.activeGroup()"
                valueKey="id" labelKey="name"
                (filterChange)="onGroupChange($event)" class="group-filter mb-4" />
            }

            <!-- Desktop Table -->
            <div class="desktop-only">
                <ng-template #rankTemplate let-row>
                    <div class="rank-cell">
                        @if (t.winnerTeamId === row.teamId) {
                        <app-icon name="military_tech" class="winner-icon icon-sm"></app-icon>
                        }
                        {{ row.rank }}
                    </div>
                </ng-template>

                <ng-template #teamTemplate let-row>
                    <div class="flex items-center gap-2">
                        <app-smart-image [src]="row.teamLogoUrl" type="team" size="xs"
                            [initials]="row.teamName.charAt(0)" />
                        <span>{{ row.teamName }}</span>
                    </div>
                </ng-template>

                <ng-template #formTemplate let-row>
                    <div class="form-dots-container">
                        @for (r of row.form; track $index) {
                        <span class="form-dot"
                            [class]="r === 'W' ? 'is-win' : (r === 'D' ? 'is-draw' : 'is-loss')">{{ r }}</span>
                        }
                    </div>
                </ng-template>

                <app-table [columns]="tableColumns" [data]="store.groupedStandings()"
                    [loading]="store.isLoading()" />
            </div>

            <!-- Mobile Cards -->
            <div class="mobile-data-grid">
                @for (s of store.groupedStandings(); track s.teamId; let i = $index) {
                <div class="mobile-data-card" [class.is-winner]="t.winnerTeamId === s.teamId">
                    <div class="card-mobile-header">
                        <div class="title-group items-center">
                            <div class="rank-badge items-center justify-center">
                                @if (t.winnerTeamId === s.teamId) {
                                <app-icon name="military_tech" class="icon-sm"></app-icon>
                                }
                                {{ i + 1 }}
                            </div>
                            <app-smart-image [src]="s.teamLogoUrl" type="team" size="xs"
                                [initials]="s.teamName.charAt(0)" />
                            <h4>{{ s.teamName }}</h4>
                        </div>
                        <app-badge [type]="t.winnerTeamId === s.teamId ? 'gold' : 'success'">
                            {{ s.points }} نقطة
                        </app-badge>
                    </div>

                    <div class="card-mobile-stats">
                        <div class="stat-box"><span class="label">لعب</span><span class="value">{{ s.played }}</span></div>
                        <div class="stat-box highlight"><span class="label">فاز</span><span class="value">{{ s.won }}</span></div>
                        <div class="stat-box"><span class="label">تعادل</span><span class="value">{{ s.drawn }}</span></div>
                        <div class="stat-box"><span class="label">خسر</span><span class="value">{{ s.lost }}</span></div>
                        <div class="stat-box"><span class="label">له</span><span class="value">{{ s.goalsFor }}</span></div>
                        <div class="stat-box"><span class="label">عليه</span><span class="value">{{ s.goalsAgainst }}</span></div>
                        <div class="stat-box"><span class="label">+/-</span><span class="value">{{ s.goalDifference }}</span></div>
                        <div class="stat-box highlight"><span class="label">نقاط</span><span class="value">{{ s.points }}</span></div>
                    </div>

                    <div class="card-mobile-footer">
                        <span class="footer-label">آخر 5 مباريات:</span>
                        <div class="footer-content">
                            @for (r of s.form; track $index) {
                            <span class="form-dot"
                                [class]="r === 'W' ? 'is-win' : (r === 'D' ? 'is-draw' : 'is-loss')">{{ r }}</span>
                            }
                        </div>
                    </div>
                </div>
                }
            </div>
        </div>
        }
    `,
    styleUrls: ['./standings-tab.component.scss']
})
export class StandingsTabComponent implements AfterViewInit {
    readonly store = inject(TournamentDetailStore);

    @ViewChild('rankTemplate') rankTemplate!: TemplateRef<unknown>;
    @ViewChild('teamTemplate') teamTemplate!: TemplateRef<unknown>;
    @ViewChild('formTemplate') formTemplate!: TemplateRef<unknown>;

    tableColumns: TableColumn[] = [];

    onGroupChange(groupId: unknown): void {
        this.store.activeGroup.set(groupId as number | null);
    }

    ngAfterViewInit(): void {
        // Defer one tick so templates are available
        Promise.resolve().then(() => {
            this.tableColumns = [
                { key: 'rank', label: '#', template: this.rankTemplate, width: '60px' },
                { key: 'teamName', label: 'الفريق', template: this.teamTemplate },
                { key: 'played', label: 'لعب', width: '60px', sortable: true },
                { key: 'won', label: 'فاز', width: '60px', sortable: true },
                { key: 'drawn', label: 'تعادل', width: '60px', sortable: true },
                { key: 'lost', label: 'خسر', width: '60px', sortable: true },
                { key: 'goalsFor', label: 'له', width: '60px' },
                { key: 'goalsAgainst', label: 'عليه', width: '60px' },
                { key: 'goalDifference', label: '+/-', width: '60px' },
                { key: 'points', label: 'نقاط', width: '80px', sortable: true },
                { key: 'form', label: 'الشكل', template: this.formTemplate, width: '120px' }
            ];
        });
    }
}
