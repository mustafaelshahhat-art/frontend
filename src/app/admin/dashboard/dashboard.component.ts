import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { ActionCardComponent } from '../../shared/components/action-card/action-card.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { WelcomeCardComponent } from '../../shared/components/welcome-card/welcome-card.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { CardComponent } from '../../shared/components/card/card.component';
import { AnalyticsService, DashboardStats, Activity } from '../../core/services/analytics.service';
import { MatchService } from '../../core/services/match.service';
import { Match } from '../../core/models/tournament.model';

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        StatCardComponent,
        ActionCardComponent,
        PageHeaderComponent,
        WelcomeCardComponent,
        ButtonComponent,
        BadgeComponent,
        EmptyStateComponent,
        CardComponent
    ],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
    private readonly router = inject(Router);
    private readonly analyticsService = inject(AnalyticsService);
    private readonly matchService = inject(MatchService);
    private readonly cdr = inject(ChangeDetectorRef);

    stats: { label: string, value: string, icon: string, colorClass: string }[] = [];
    recentActivities: Activity[] = [];
    liveMatches: Match[] = [];

    ngOnInit(): void {
        this.loadDashboardData();
    }

    loadDashboardData(): void {
        // TODO: Implement proper error handling and layout for empty states
        this.analyticsService.getDashboardStats().subscribe({
            next: (data: DashboardStats) => {
                setTimeout(() => {
                    this.stats = [
                        { label: 'إجمالي المستخدمين', value: data.totalUsers.toLocaleString(), icon: 'groups', colorClass: 'info' },
                        { label: 'البطولات النشطة', value: data.activeTournaments.toString(), icon: 'emoji_events', colorClass: 'primary' },
                        { label: 'المباريات اليوم', value: data.matchesToday.toString(), icon: 'sports_soccer', colorClass: 'gold' },
                        { label: 'إجمالي الأهداف', value: data.totalGoals.toString(), icon: 'stars', colorClass: 'success' },
                        { label: 'اعتراضات معلقة', value: data.pendingObjections.toString(), icon: 'report_problem', colorClass: 'danger' }
                    ];
                    this.cdr.detectChanges();
                });
            },
            error: () => {
                setTimeout(() => {
                    this.stats = [
                        { label: 'إجمالي المستخدمين', value: '0', icon: 'groups', colorClass: 'info' },
                        { label: 'البطولات النشطة', value: '0', icon: 'emoji_events', colorClass: 'primary' },
                        { label: 'المباريات اليوم', value: '0', icon: 'sports_soccer', colorClass: 'gold' },
                        { label: 'إجمالي الأهداف', value: '0', icon: 'stars', colorClass: 'success' },
                        { label: 'اعتراضات معلقة', value: '0', icon: 'report_problem', colorClass: 'danger' }
                    ];
                    this.cdr.detectChanges();
                });
            }
        });

        this.analyticsService.getRecentActivities().subscribe({
            next: (data) => {
                setTimeout(() => {
                    this.recentActivities = data;
                    this.cdr.detectChanges();
                });
            },
            error: () => {
                setTimeout(() => {
                    this.recentActivities = [];
                    this.cdr.detectChanges();
                });
            }
        });

        this.matchService.getLiveMatches().subscribe({
            next: (data) => {
                setTimeout(() => {
                    this.liveMatches = data;
                    this.cdr.detectChanges();
                });
            },
            error: () => {
                setTimeout(() => {
                    this.liveMatches = [];
                    this.cdr.detectChanges();
                });
            }
        });
    }

    navigateTo(path: string): void {
        this.router.navigate([path]);
    }
}

