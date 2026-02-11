import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { Component, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BracketDto, Match, MatchStatus, BracketRound } from '../../../../core/models/tournament.model';
import { SmartImageComponent } from '../../../../shared/components/smart-image/smart-image.component';
import { Router } from '@angular/router';
import { ContextNavigationService } from '../../../../core/navigation/context-navigation.service';
import { inject } from '@angular/core';

interface BracketPairing {
  id: string; // unique key (e.g. min(TeamA,TeamB)-max(TeamA,TeamB))
  matches: Match[];
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeLogo?: string;
  awayLogo?: string;
  homeScoreAgg: number;
  awayScoreAgg: number;
  status: MatchStatus; // Overall status
  winnerId?: string;
  isDoubleLeg: boolean;
}

interface BracketRoundView {
  roundNumber: number;
  name: string;
  pairings: BracketPairing[];
}

@Component({
  selector: 'app-tournament-brackets',
  standalone: true,
  imports: [IconComponent, CommonModule, SmartImageComponent],
  template: `
    <div class="bracket-container" *ngIf="rounds.length > 0; else emptyState">
      <div class="bracket-wrapper">
        <div class="round-column" *ngFor="let round of rounds; let last = last">
          <h3 class="round-title">{{ round.name }}</h3>
          <div class="pairings-list">
            <div class="pairing-card" *ngFor="let pair of round.pairings" (click)="viewMatch(pair)">
              
              <!-- Connector Lines (CSS) -->
              <div class="connector-line" *ngIf="!last"></div>

              <!-- Team A -->
              <div class="team-row" [class.winner]="isWinner(pair, pair.homeTeamId)">
                <div class="team-info">
                  <app-smart-image [src]="pair.homeLogo" type="team" size="xs" [initials]="pair.homeTeamName.charAt(0)"></app-smart-image>
                  <span class="name">{{ pair.homeTeamName }}</span>
                </div>
                <div class="scores" *ngIf="pair.status !== 'Scheduled'">
                  <span class="score-main">{{ pair.homeScoreAgg }}</span>
                  <span class="score-sub" *ngIf="pair.isDoubleLeg">
                    ({{ getLegScore(pair, pair.homeTeamId, 0) }} - {{ getLegScore(pair, pair.homeTeamId, 1) }})
                  </span>
                </div>
              </div>

              <!-- Team B -->
              <div class="team-row" [class.winner]="isWinner(pair, pair.awayTeamId)">
                <div class="team-info">
                  <app-smart-image [src]="pair.awayLogo" type="team" size="xs" [initials]="pair.awayTeamName.charAt(0)"></app-smart-image>
                  <span class="name">{{ pair.awayTeamName }}</span>
                </div>
                <div class="scores" *ngIf="pair.status !== 'Scheduled'">
                  <span class="score-main">{{ pair.awayScoreAgg }}</span>
                  <span class="score-sub" *ngIf="pair.isDoubleLeg">
                    ({{ getLegScore(pair, pair.awayTeamId, 0) }} - {{ getLegScore(pair, pair.awayTeamId, 1) }})
                  </span>
                </div>
              </div>

              <div class="match-meta">
                 <span *ngIf="pair.status === 'Live'" class="live-indicator">مباشر</span>
                 <span *ngIf="pair.status === 'Scheduled'" class="time">{{ getStartTime(pair) | date:'shortTime' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <ng-template #emptyState>
        <div class="empty-bracket">
            <app-icon name="account_tree" class="icon icon-sm"></app-icon>
            <p>لم تبدأ الأدوار الإقصائية بعد</p>
        </div>
    </ng-template>
  `,
  styles: [`
    .bracket-container {
      overflow-x: auto;
      padding: 20px 10px;
      direction: ltr; /* Brackets usually flow LTR or RTL. Let's force LTR for tree logic or support RTL carefully. */
    }
    .bracket-wrapper {
      display: flex;
      gap: 40px;
      min-width: max-content;
    }
    .round-column {
      display: flex;
      flex-direction: column;
      gap: 20px;
      min-width: 280px;
    }
    .round-title {
      text-align: center;
      color: var(--text-secondary);
      font-weight: 600;
      margin-bottom: 10px;
    }
    .pairings-list {
      display: flex;
      flex-direction: column;
      justify-content: space-around;
      flex-grow: 1;
      gap: 20px;
    }
    .pairing-card {
      background: var(--surface-card);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 10px;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
      
      &:hover {
        border-color: var(--primary-color);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }
    }
    .team-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      border-bottom: 1px solid var(--border-light);
      
      &:last-child { border-bottom: none; }
      
      &.winner {
        font-weight: bold;
        color: var(--success-color);
        
        .name { color: var(--success-color); }
      }
    }
    .team-info {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .name {
        font-size: 0.9rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 140px;
    }
    .scores {
        display: flex;
        align-items: center;
        gap: 6px;
    }
    .score-main {
        font-weight: 700;
        font-size: 1rem;
    }
    .score-sub {
        font-size: 0.75rem;
        color: var(--text-muted);
    }
    .match-meta {
        font-size: 0.75rem;
        color: var(--text-muted);
        text-align: right;
        margin-top: 4px;
    }
    .live-indicator {
        color: var(--danger-color);
        font-weight: bold;
        animation: pulse 1.5s infinite;
    }
    .empty-bracket {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px;
        color: var(--text-muted);
        
        .icon { font-size: 48px; margin-bottom: 10px; opacity: 0.5; }
    }
    
    /* Connectors (Simple implementation) */
    /* This requires more complex CSS calc based on children count. 
       For "Tree-style", usually we use Flexbox alignments.
       The current flex-direction: column + justify-content: space-around helps space them out.
    */
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TournamentBracketsComponent implements OnChanges {
  @Input() bracket: BracketDto | null = null;
  rounds: BracketRoundView[] = [];

  private navService = inject(ContextNavigationService);
  constructor(private router: Router) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['bracket'] && this.bracket) {
      this.processBracket(this.bracket);
    }
  }

  processBracket(bracket: BracketDto): void {
    if (!bracket.rounds) return;

    this.rounds = bracket.rounds.sort((a: BracketRound, b: BracketRound) => a.roundNumber - b.roundNumber).map((r: BracketRound) => {
      // Group matches into pairings
      const pairings: BracketPairing[] = [];
      const processedMatches = new Set<string>();

      r.matches.forEach((m: Match) => {
        if (processedMatches.has(m.id)) return;

        // Try to find return leg
        const returnLeg = r.matches.find((om: Match) => om.id !== m.id && om.homeTeamId === m.awayTeamId && om.awayTeamId === m.homeTeamId);

        const pairing: BracketPairing = {
          id: m.id,
          matches: returnLeg ? [m, returnLeg] : [m],
          homeTeamId: m.homeTeamId,
          awayTeamId: m.awayTeamId,
          homeTeamName: m.homeTeamName,
          awayTeamName: m.awayTeamName,
          homeLogo: m.homeTeamLogoUrl,
          awayLogo: m.awayTeamLogoUrl,
          homeScoreAgg: m.homeScore + (returnLeg ? returnLeg.awayScore : 0),
          awayScoreAgg: m.awayScore + (returnLeg ? returnLeg.homeScore : 0),
          status: (m.status === MatchStatus.FINISHED && (!returnLeg || returnLeg.status === MatchStatus.FINISHED)) ? MatchStatus.FINISHED :
            (m.status === MatchStatus.LIVE || (returnLeg && returnLeg.status === MatchStatus.LIVE)) ? MatchStatus.LIVE : MatchStatus.SCHEDULED,
          isDoubleLeg: !!returnLeg
        };

        if (returnLeg) {
          processedMatches.add(returnLeg.id);
          // Sort matches by date to ensure Leg 1 is first
          pairing.matches.sort((a: Match, b: Match) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
        }
        processedMatches.add(m.id);
        pairings.push(pairing);
      });

      return {
        roundNumber: r.roundNumber,
        name: r.name,
        pairings: pairings
      };
    });
  }

  getLegScore(pair: BracketPairing, teamId: string, legIndex: number): number | string {
    if (!pair.matches[legIndex]) return '-';
    const m = pair.matches[legIndex];
    // If teamId is home in this match
    if (m.homeTeamId === teamId) return m.homeScore;
    return m.awayScore;
  }

  isWinner(pair: BracketPairing, teamId: string): boolean {
    if (pair.status !== MatchStatus.FINISHED) return false;
    if (pair.homeScoreAgg > pair.awayScoreAgg && pair.homeTeamId === teamId) return true;
    if (pair.awayScoreAgg > pair.homeScoreAgg && pair.awayTeamId === teamId) return true;
    // Tie?
    return false;
  }

  getStartTime(pair: BracketPairing): Date | undefined {
    return pair.matches[0]?.date;
  }

  viewMatch(pair: BracketPairing): void {
    // Navigate to first match or latest relevant?
    const matchToView = pair.matches.find(m => m.status === MatchStatus.LIVE) || pair.matches[pair.matches.length - 1];
    this.navService.navigateTo(['matches', matchToView.id]);
  }
}
