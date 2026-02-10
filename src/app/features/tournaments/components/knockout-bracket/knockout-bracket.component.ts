import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { Component, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BracketDto, Match, MatchStatus, BracketRound, RegistrationStatus } from '../../../../core/models/tournament.model';
import { SmartImageComponent } from '../../../../shared/components/smart-image/smart-image.component';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { UserRole } from '../../../../core/models/user.model';

interface BracketPairing {
    id: string;
    matches: Match[]; // In case of double legs
    homeTeamId: string;
    awayTeamId: string;
    homeTeamName: string;
    awayTeamName: string;
    homeLogo?: string;
    awayLogo?: string;
    homeScoreAgg: number;
    awayScoreAgg: number;
    status: MatchStatus;
    winnerId?: string;
    isDoubleLeg: boolean;
    stageName?: string;
}

interface BracketRoundView {
    roundNumber: number;
    name: string;
    pairings: BracketPairing[];
}

@Component({
    selector: 'app-knockout-bracket',
    standalone: true,
    imports: [IconComponent, CommonModule, SmartImageComponent],
    templateUrl: './knockout-bracket.component.html',
    styleUrls: ['./knockout-bracket.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class KnockoutBracketComponent implements OnChanges {
    @Input() rounds: BracketRound[] = [];
    processedRounds: BracketRoundView[] = [];

    private router = inject(Router);
    private authService = inject(AuthService);

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['rounds']) {
            this.processBracket();
        }
    }

    processBracket(): void {
        if (!this.rounds || this.rounds.length === 0) {
            this.processedRounds = [];
            return;
        }

        this.processedRounds = this.rounds
            .sort((a, b) => a.roundNumber - b.roundNumber)
            .map((r) => {
                const pairings: BracketPairing[] = [];
                const processedMatches = new Set<string>();

                r.matches.forEach((m) => {
                    if (processedMatches.has(m.id)) return;

                    // Handle double legs if home/away teams are reversed in another match in the same round
                    const returnLeg = r.matches.find((om) =>
                        om.id !== m.id &&
                        om.homeTeamId === m.awayTeamId &&
                        om.awayTeamId === m.homeTeamId
                    );

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
                        status: (m.status === MatchStatus.FINISHED && (!returnLeg || returnLeg.status === MatchStatus.FINISHED))
                            ? MatchStatus.FINISHED
                            : (m.status === MatchStatus.LIVE || (returnLeg && returnLeg.status === MatchStatus.LIVE))
                                ? MatchStatus.LIVE
                                : MatchStatus.SCHEDULED,
                        isDoubleLeg: !!returnLeg,
                        stageName: m.stageName
                    };

                    // Determine winner if finished
                    if (pairing.status === MatchStatus.FINISHED) {
                        if (pairing.homeScoreAgg > pairing.awayScoreAgg) pairing.winnerId = pairing.homeTeamId;
                        else if (pairing.awayScoreAgg > pairing.homeScoreAgg) pairing.winnerId = pairing.awayTeamId;
                        // In case of draws, backend usually handles progression/penalties which would reflect in winnerId if we had it.
                        // For UI, we'll highlight the higher score or check progression logic.
                    }

                    if (returnLeg) {
                        processedMatches.add(returnLeg.id);
                        pairing.matches.sort((a, b) => {
                            const dateA = a.date ? new Date(a.date).getTime() : 0;
                            const dateB = b.date ? new Date(b.date).getTime() : 0;
                            return dateA - dateB;
                        });
                    }
                    processedMatches.add(m.id);
                    pairings.push(pairing);
                });

                return {
                    roundNumber: r.roundNumber,
                    name: r.name || this.inferRoundName(r.roundNumber, this.rounds.length),
                    pairings: pairings
                };
            });
    }

    inferRoundName(roundNumber: number, totalRounds: number): string {
        const diff = totalRounds - roundNumber;
        switch (diff) {
            case 0: return 'النهائي';
            case 1: return 'نصف النهائي';
            case 2: return 'ربع النهائي';
            case 3: return 'دور الـ 16';
            default: return `الدور ${roundNumber}`;
        }
    }

    isWinner(pair: BracketPairing, teamId: string): boolean {
        if (pair.status !== MatchStatus.FINISHED) return false;
        return pair.winnerId === teamId || (pair.homeTeamId === teamId && pair.homeScoreAgg > pair.awayScoreAgg) || (pair.awayTeamId === teamId && pair.awayScoreAgg > pair.homeScoreAgg);
    }

    getScore(pair: BracketPairing, teamId: string): string {
        if (pair.status === MatchStatus.SCHEDULED) return '—';
        return teamId === pair.homeTeamId ? pair.homeScoreAgg.toString() : pair.awayScoreAgg.toString();
    }

    viewMatch(pair: BracketPairing): void {
        const isAdmin = this.authService.getCurrentUser()?.role === UserRole.ADMIN;
        const prefix = isAdmin ? '/admin' : '/captain';
        // Navigate to the specific match (if double leg, maybe the active or latest one)
        const matchId = pair.matches.find(m => m.status === MatchStatus.LIVE)?.id || pair.matches[pair.matches.length - 1].id;
        this.router.navigate([prefix, 'matches', matchId]);
    }
}
