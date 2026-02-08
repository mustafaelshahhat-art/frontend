import { Component, OnInit, inject, ChangeDetectorRef, effect } from '@angular/core';
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
import { MatchStore } from '../../core/stores/match.store';
import { TournamentStore } from '../../core/stores/tournament.store';
import { UserStore } from '../../core/stores/user.store';
import { ActivityStore } from '../../core/stores/activity.store';

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
    private readonly matchStore = inject(MatchStore);
    private readonly tournamentStore = inject(TournamentStore);
    private readonly userStore = inject(UserStore);
    private readonly activityStore = inject(ActivityStore);

    stats: { label: string, value: string, icon: string, colorClass: string }[] = [];
    recentActivities: Activity[] = [];
    liveMatches: Match[] = [];

    constructor() {
        // React to store changes for automatic updates
        effect(() => {
            this.updateStatsFromStores();
            this.updateLiveMatchesFromStore();
        });
    }

    ngOnInit(): void {
        this.loadInitialData();
    }

    private loadInitialData(): void {
        // Load initial data into stores
        this.loadDashboardStats();
        this.loadActivities();
        this.loadLiveMatches();
    }

    private loadDashboardStats(): void {
        this.analyticsService.getDashboardStats().subscribe({
            next: (data: DashboardStats) => {
                // Update stores with fresh data
                this.userStore.setUsers(Array(data.totalUsers).fill({} as any)); // Simplified
                // Tournament store would be updated by tournament service
                queueMicrotask(() => {
                    this.updateStatsFromStores();
                    this.cdr.detectChanges();
                });
            },
            error: () => {
                queueMicrotask(() => {
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
    }

    private updateStatsFromStores(): void {
        const users = this.userStore.users();
        const tournaments = this.tournamentStore.activeTournaments();
        const matches = this.matchStore.matches();
        const liveMatches = this.matchStore.ongoingMatches();

        this.stats = [
            { label: 'إجمالي المستخدمين', value: users.length.toString(), icon: 'groups', colorClass: 'info' },
            { label: 'البطولات النشطة', value: tournaments.length.toString(), icon: 'emoji_events', colorClass: 'primary' },
            { label: 'المباريات اليوم', value: matches.length.toString(), icon: 'sports_soccer', colorClass: 'gold' },
            { label: 'المباريات الحية', value: liveMatches.length.toString(), icon: 'sensors', colorClass: 'danger' },
            { label: 'اعتراضات معلقة', value: '0', icon: 'report_problem', colorClass: 'danger' } // Would come from objections store
        ];
    }

    private loadActivities(): void {
        this.analyticsService.getRecentActivities().subscribe({
            next: (data) => {
                // Transform analytics activities to store format
                const storeActivities: any[] = data.map(activity => ({
                    id: crypto.randomUUID(),
                    userId: '',
                    userName: activity.userName || 'System',
                    action: activity.action || activity.type,
                    entityType: 'System',
                    entityId: '',
                    description: activity.message,
                    timestamp: activity.timestamp ? new Date(activity.timestamp) : new Date(activity.time)
                }));
                this.activityStore.setActivities(storeActivities);
                queueMicrotask(() => {
                    this.recentActivities = data;
                    this.cdr.detectChanges();
                });
            },
            error: () => {
                queueMicrotask(() => {
                    this.recentActivities = [];
                    this.cdr.detectChanges();
                });
            }
        });
    }

    private loadLiveMatches(): void {
        this.matchService.getLiveMatches().subscribe({
            next: (data) => {
                // Update match store with live matches
                this.matchStore.setMatches(data);
                queueMicrotask(() => {
                    this.updateLiveMatchesFromStore();
                    this.cdr.detectChanges();
                });
            },
            error: () => {
                queueMicrotask(() => {
                    this.liveMatches = [];
                    this.cdr.detectChanges();
                });
            }
        });
    }

    private updateLiveMatchesFromStore(): void {
        this.liveMatches = this.matchStore.ongoingMatches();
    }

    navigateTo(path: string): void {
        this.router.navigate([path]);
    }
}
