import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { WelcomeCardComponent } from '../../shared/components/welcome-card/welcome-card.component';
import { MatchCardComponent } from '../../shared/components/match-card/match-card.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { Match } from '../../core/models/tournament.model';
import { AuthService } from '../../core/services/auth.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { MatchService } from '../../core/services/match.service';

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
    private readonly analyticsService = inject(AnalyticsService);
    private readonly matchService = inject(MatchService);
    private readonly cdr = inject(ChangeDetectorRef);

    currentUser = this.authService.getCurrentUser();
    stats: { label: string, value: string, icon: string, colorClass: string }[] = [];
    nextMatch: Match | null = null;
    notifications: any[] = [];

    ngOnInit(): void {
        this.loadDashboardData();
    }

    loadDashboardData(): void {
        // TODO: Implement backend analytics endpoint for captain stats
        this.stats = [
            { label: 'اللاعبين', value: '0', icon: 'groups', colorClass: 'info' },
            { label: 'المباريات القادمة', value: '0', icon: 'sports_soccer', colorClass: 'primary' },
            { label: 'البطولات النشطة', value: '0', icon: 'emoji_events', colorClass: 'gold' },
            { label: 'الترتيب', value: '-', icon: 'military_tech', colorClass: 'info' }
        ];

        // TODO: Implement actual data fetching from services
        this.matchService.getUpcomingMatches().subscribe({
            next: (matches) => {
                setTimeout(() => {
                    const myTeamId = this.currentUser?.teamId;
                    if (myTeamId) {
                        this.nextMatch = matches.find(m => m.homeTeamId === myTeamId || m.awayTeamId === myTeamId) || null;
                    }
                    this.cdr.detectChanges();
                });
            },
            error: () => {
                setTimeout(() => {
                    this.nextMatch = null;
                    this.cdr.detectChanges();
                });
            }
        });

        // TODO: Implement notifications service
        this.notifications = [];
    }

    viewMatchDetails(): void {
        if (this.nextMatch) {
            this.router.navigate(['/captain/matches', this.nextMatch.id]);
        }
    }
}

