import { IconComponent } from '../../shared/components/icon/icon.component';
import { Component, OnInit, inject, ChangeDetectorRef, signal, computed, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminLayoutService } from '../../core/services/admin-layout.service';
import { Router } from '@angular/router';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { ActionCardComponent } from '../../shared/components/action-card/action-card.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
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
import { ActivityStore, StoreActivity } from '../../core/stores/activity.store';
import { AuthStore } from '../../core/stores/auth.store';

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [IconComponent,
        CommonModule,
        StatCardComponent,
        ActionCardComponent,
        PageHeaderComponent,
        ButtonComponent,
        BadgeComponent,
        EmptyStateComponent,
        CardComponent
    ],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
    private readonly router = inject(Router);
    private readonly analyticsService = inject(AnalyticsService);
    private readonly matchService = inject(MatchService);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly matchStore = inject(MatchStore);
    private readonly tournamentStore = inject(TournamentStore);
    private readonly userStore = inject(UserStore);
    private readonly activityStore = inject(ActivityStore);
    private readonly authStore = inject(AuthStore);
    private readonly adminLayout = inject(AdminLayoutService);

    // Computed Stats from Stores
    stats = computed(() => {
        const totalUsers = this.userStore.totalUserCount();
        const tournaments = this.tournamentStore.activeTournaments();
        const matches = this.matchStore.matches();
        const liveMatches = this.matchStore.ongoingMatches();
        const loginsCount = this.loginsTodaySignal();
        const teamsCount = this.totalTeamsSignal();
        const refereesCount = this.totalRefereesSignal();

        return [
            { label: 'إجمالي المستخدمين', value: totalUsers.toString(), icon: 'groups', colorClass: 'info', route: '/admin/users' },
            { label: 'الفرق المسجلة', value: teamsCount.toString(), icon: 'shield', colorClass: 'primary', route: '/admin/teams' },
            { label: 'طاقم التحكيم', value: refereesCount.toString(), icon: 'sports_soccer', colorClass: 'gold', route: '/admin/users' },
            { label: 'نشاط الدخول اليوم', value: loginsCount.toString(), icon: 'login', colorClass: 'success', route: '/admin/activity-log' },
            { label: 'البطولات النشطة', value: tournaments.length.toString(), icon: 'emoji_events', colorClass: 'primary', route: '/admin/tournaments' },
            { label: 'المباريات اليوم', value: matches.length.toString(), icon: 'sports_soccer', colorClass: 'gold', route: '/admin/matches' },
            { label: 'المباريات الحية', value: liveMatches.length.toString(), icon: 'sensors', colorClass: 'danger', route: '/admin/matches' },
            { label: 'اعتراضات معلقة', value: '0', icon: 'report_problem', colorClass: 'danger', route: '/admin/objections' }
        ];
    });

    recentActivities: Activity[] = [];
    liveMatches: Match[] = [];
    loginsTodaySignal = signal(0);
    totalTeamsSignal = signal(0);
    totalRefereesSignal = signal(0);


    ngOnInit(): void {
        const isAdmin = this.authStore.currentUser()?.role === 'Admin';
        const title = isAdmin ? 'منصة التحكم للمدير' : 'منصة منشئ البطولة';
        const subtitle = isAdmin ? 'مرحباً بك، إليك ملخص النشاط الحالي' : 'مرحباً بك، تتبع بطولاتك وأنشطتها هنا';

        this.adminLayout.setTitle(title);
        this.adminLayout.setSubtitle(subtitle);
        this.loadInitialData();
    }

    ngOnDestroy(): void {
        this.adminLayout.reset();
    }

    private loadInitialData(): void {
        this.loadDashboardStats();
        this.loadActivities();
        this.loadLiveMatches();
    }

    private loadDashboardStats(): void {
        this.analyticsService.getDashboardStats().subscribe({
            next: (data: DashboardStats) => {
                this.userStore.setTotalUserCount(data.totalUsers);
                this.loginsTodaySignal.set(data.loginsToday);
                this.totalTeamsSignal.set(data.totalTeams);
                this.totalRefereesSignal.set(data.totalReferees);
                this.cdr.detectChanges();
            },
            error: () => {
                this.userStore.setTotalUserCount(0);
                this.cdr.detectChanges();
            }
        });
    }

    private loadActivities(): void {
        this.analyticsService.getRecentActivities().subscribe({
            next: (data) => {
                // Transform analytics activities to store format
                const storeActivities: StoreActivity[] = data.map(activity => ({
                    id: this.generateUUID(),
                    userId: '',
                    userName: activity.userName || 'System',
                    action: activity.action || activity.type,
                    entityType: 'System',
                    entityId: '',
                    description: activity.message,
                    timestamp: activity.timestamp ? new Date(activity.timestamp) : new Date(Date.now())
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

    private generateUUID(): string {
        try {
            if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
                return crypto.randomUUID();
            }
        } catch (e) {
            // Fallback for secure context restrictions
        }

        // Fallback for non-secure contexts (e.g. http://0.0.0.0)
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    navigateTo(path: string): void {
        this.router.navigate([path]);
    }
}
