import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { WelcomeCardComponent } from '../../shared/components/welcome-card/welcome-card.component';
import { MatchCardComponent } from '../../shared/components/match-card/match-card.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { Match, MatchStatus } from '../../core/models/tournament.model';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-captain-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        WelcomeCardComponent,
        StatCardComponent,
        MatchCardComponent,
        ButtonComponent
    ],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class CaptainDashboardComponent implements OnInit {
    private readonly router = inject(Router);
    private readonly authService = inject(AuthService);

    currentUser = this.authService.getCurrentUser();

    stats = [
        { label: 'اللاعبين', value: '12', icon: 'groups', colorClass: 'info' },
        { label: 'المباريات القادمة', value: '2', icon: 'sports_soccer', colorClass: 'primary' },
        { label: 'البطولات النشطة', value: '1', icon: 'emoji_events', colorClass: 'gold' },
        { label: 'الترتيب', value: '#3', icon: 'military_tech', colorClass: 'info' }
    ];

    nextMatch = {
        id: '1',
        homeTeam: 'فريقي',
        awayTeam: 'النجوم',
        date: 'غداً'
    };

    get matchCardData(): Match {
        return {
            id: this.nextMatch.id,
            tournamentId: 'mock-tourn',
            homeTeamId: 'my-team',
            awayTeamId: 'opp-team',
            homeTeamName: this.nextMatch.homeTeam,
            awayTeamName: this.nextMatch.awayTeam,
            homeScore: 0,
            awayScore: 0,
            status: MatchStatus.SCHEDULED,
            refereeId: 'mock-ref',
            refereeName: 'Pending',
            yellowCards: [],
            redCards: [],
            goals: []
        } as Match;
    }

    notifications = [
        { title: 'تم تأكيد موعد مباراتك القادمة', time: 'منذ ساعة', read: false },
        { title: 'تم قبول تسجيل لاعب جديد', time: 'منذ 3 ساعات', read: true },
        { title: 'موعد انتهاء التسجيل يقترب', time: 'منذ يوم', read: true }
    ];

    ngOnInit(): void { }

    viewMatchDetails(): void {
        this.router.navigate(['/captain/matches', this.nextMatch.id]);
    }
}
