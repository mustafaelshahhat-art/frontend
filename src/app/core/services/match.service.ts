import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { Match, MatchStatus, Card, Goal, MatchEvent, MatchEventType, MatchReport } from '../models/tournament.model';


@Injectable({
    providedIn: 'root'
})
export class MatchService {
    private mockMatches: Match[] = [
        {
            id: 'm1', tournamentId: 't1',
            tournamentName: 'بطولة رمضان الكبرى',
            homeTeamId: 'team1', awayTeamId: 'team2',
            homeTeamName: 'النجوم', awayTeamName: 'الصقور',
            homeScore: 2, awayScore: 1,
            status: MatchStatus.FINISHED,
            refereeId: 'ref1', refereeName: 'محمد الحكم',
            yellowCards: [], redCards: [], goals: [],
            date: new Date('2026-03-24T20:00:00'),
            events: [
                { id: 'ev1', matchId: 'm1', type: MatchEventType.GOAL, playerName: 'أحمد سعيد', teamId: 'team1', createdAt: new Date() },
                { id: 'ev2', matchId: 'm1', type: MatchEventType.YELLOW_CARD, playerName: 'خالد سعد', teamId: 'team2', createdAt: new Date() },
                { id: 'ev3', matchId: 'm1', type: MatchEventType.GOAL, playerName: 'محمد علي', teamId: 'team1', createdAt: new Date() }
            ]
        },
        {
            id: 'm2', tournamentId: 't1',
            tournamentName: 'بطولة رمضان الكبرى',
            homeTeamId: 'team1', awayTeamId: 'team4',
            homeTeamName: 'النجوم', awayTeamName: 'القادسية',
            homeScore: 0, awayScore: 0,
            status: MatchStatus.SCHEDULED,
            refereeId: 'ref2', refereeName: 'أحمد سعيد',
            yellowCards: [], redCards: [], goals: [],
            date: new Date('2026-03-26T21:30:00'),
            events: []
        },
        {
            id: 'm3', tournamentId: 't1',
            tournamentName: 'بطولة رمضان الكبرى',
            homeTeamId: 'team1', awayTeamId: 'team3',
            homeTeamName: 'النجوم', awayTeamName: 'الأمل',
            homeScore: 1, awayScore: 1,
            status: MatchStatus.LIVE,
            refereeId: 'ref1', refereeName: 'محمد الحكم',
            yellowCards: [{ playerId: 'p1', playerName: 'سعد أحمد', teamId: 'team1', type: 'yellow' }],
            redCards: [],
            goals: [
                { playerId: 'p2', playerName: 'خالد محمد', teamId: 'team1' },
                { playerId: 'p5', playerName: 'فهد سعود', teamId: 'team3' }
            ],
            date: new Date('2026-03-28T22:00:00'),
            events: [
                { id: 'ev4', matchId: 'm3', type: MatchEventType.GOAL, playerName: 'خالد محمد', teamId: 'team1', createdAt: new Date() },
                { id: 'ev5', matchId: 'm3', type: MatchEventType.YELLOW_CARD, playerName: 'سعد أحمد', teamId: 'team1', createdAt: new Date() },
                { id: 'ev6', matchId: 'm3', type: MatchEventType.GOAL, playerName: 'فهد سعود', teamId: 'team3', createdAt: new Date() }
            ]
        }
    ];

    getMatches(): Observable<Match[]> {
        return of(this.mockMatches);
    }

    getMatchById(id: string): Observable<Match | undefined> {
        return of(this.mockMatches.find(m => m.id === id));
    }

    getMatchesByTournament(tournamentId: string): Observable<Match[]> {
        return of(this.mockMatches.filter(m => m.tournamentId === tournamentId));
    }

    getMatchesByReferee(refereeId: string): Observable<Match[]> {
        return of(this.mockMatches.filter(m => m.refereeId === refereeId));
    }

    getMatchesByTeam(teamId: string): Observable<Match[]> {
        return of(this.mockMatches.filter(m => m.homeTeamId === teamId || m.awayTeamId === teamId));
    }

    getLiveMatches(): Observable<Match[]> {
        return of(this.mockMatches.filter(m => m.status === MatchStatus.LIVE));
    }

    getUpcomingMatches(): Observable<Match[]> {
        return of(this.mockMatches.filter(m => m.status === MatchStatus.SCHEDULED));
    }

    updateMatchScore(id: string, homeScore: number, awayScore: number): Observable<boolean> {
        const match = this.mockMatches.find(m => m.id === id);
        if (match) {
            match.homeScore = homeScore;
            match.awayScore = awayScore;
        }
        return of(true);
    }

    updateMatchStatus(id: string, status: MatchStatus): Observable<boolean> {
        const match = this.mockMatches.find(m => m.id === id);
        if (match) match.status = status;
        return of(true);
    }

    addGoal(matchId: string, goal: Goal): Observable<boolean> {
        const match = this.mockMatches.find(m => m.id === matchId);
        if (match) {
            match.goals.push(goal);
            if (goal.teamId === match.homeTeamId) match.homeScore++;
            else match.awayScore++;
        }
        return of(true);
    }

    addCard(matchId: string, card: Card): Observable<boolean> {
        const match = this.mockMatches.find(m => m.id === matchId);
        if (match) {
            if (card.type === 'yellow') match.yellowCards.push(card);
            else match.redCards.push(card);
        }
        return of(true);
    }

    startMatch(matchId: string): Observable<Match | undefined> {
        const match = this.mockMatches.find(m => m.id === matchId);
        if (match) {
            match.status = MatchStatus.LIVE;
            match.events = [];
        }
        return of(match);
    }

    endMatch(matchId: string): Observable<Match | undefined> {
        const match = this.mockMatches.find(m => m.id === matchId);
        if (match) {
            match.status = MatchStatus.FINISHED;
        }
        return of(match);
    }

    addMatchEvent(matchId: string, event: Omit<MatchEvent, 'id' | 'matchId' | 'createdAt'>): Observable<Match | undefined> {
        const match = this.mockMatches.find(m => m.id === matchId);
        if (match) {
            if (!match.events) match.events = [];
            const newEvent: MatchEvent = {
                id: `event-${Date.now()}`,
                matchId,
                ...event,
                createdAt: new Date()
            };
            match.events.push(newEvent);

            // Auto-update score for goals
            if (event.type === MatchEventType.GOAL) {
                if (event.teamId === match.homeTeamId) match.homeScore++;
                else match.awayScore++;
            }
        }
        return of(match);
    }

    /**
     * Submit match report by referee
     */
    submitMatchReport(matchId: string, notes: string, refereeId: string, refereeName: string): Observable<Match | undefined> {
        const match = this.mockMatches.find(m => m.id === matchId);
        if (!match) {
            return throwError(() => new Error('المباراة غير موجودة'));
        }

        if (match.status !== MatchStatus.FINISHED) {
            return throwError(() => new Error('يجب إنهاء المباراة أولاً قبل تقديم التقرير'));
        }

        // Calculate stats from events
        const events = match.events || [];
        const homeGoals = events.filter(e => e.type === MatchEventType.GOAL && e.teamId === match.homeTeamId).length;
        const awayGoals = events.filter(e => e.type === MatchEventType.GOAL && e.teamId === match.awayTeamId).length;
        const homeYellows = events.filter(e => e.type === MatchEventType.YELLOW_CARD && e.teamId === match.homeTeamId).length;
        const awayYellows = events.filter(e => e.type === MatchEventType.YELLOW_CARD && e.teamId === match.awayTeamId).length;
        const homeReds = events.filter(e => e.type === MatchEventType.RED_CARD && e.teamId === match.homeTeamId).length;
        const awayReds = events.filter(e => e.type === MatchEventType.RED_CARD && e.teamId === match.awayTeamId).length;

        match.report = {
            submittedAt: new Date(),
            refereeId,
            refereeName,
            notes,
            homeTeamGoals: homeGoals,
            awayTeamGoals: awayGoals,
            homeTeamYellowCards: homeYellows,
            awayTeamYellowCards: awayYellows,
            homeTeamRedCards: homeReds,
            awayTeamRedCards: awayReds,
            isSubmitted: true
        };

        return of(match);
    }

    /**
     * Get match report
     */
    getMatchReport(matchId: string): Observable<MatchReport | null> {
        const match = this.mockMatches.find(m => m.id === matchId);
        return of(match?.report || null);
    }

    postponeMatch(matchId: string): Observable<boolean> {
        const match = this.mockMatches.find(m => m.id === matchId);
        if (match) {
            match.status = MatchStatus.POSTPONED;
            return of(true);
        }
        return of(false);
    }

    resetMatch(matchId: string): Observable<Match | undefined> {
        const match = this.mockMatches.find(m => m.id === matchId);
        if (match) {
            match.status = MatchStatus.SCHEDULED;
            match.homeScore = 0;
            match.awayScore = 0;
            match.events = [];
            match.report = undefined;
        }
        return of(match);
    }

    assignReferee(matchId: string, refereeId: string, refereeName: string): Observable<Match | undefined> {
        const match = this.mockMatches.find(m => m.id === matchId);
        if (match) {
            match.refereeId = refereeId;
            match.refereeName = refereeName;
        }
        return of(match);
    }
}

