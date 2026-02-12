import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { Component, OnInit, inject, ChangeDetectorRef, ChangeDetectionStrategy, signal, computed, ViewChild, TemplateRef, AfterViewInit, OnDestroy } from '@angular/core';
import { LayoutOrchestratorService } from '../../../../core/services/layout-orchestrator.service';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ContextNavigationService } from '../../../../core/navigation/context-navigation.service';
import { MatchService } from '../../../../core/services/match.service';
import { Match, MatchStatus, MatchEventType } from '../../../../core/models/tournament.model';
import { AuthService } from '../../../../core/services/auth.service';
import { UserRole } from '../../../../core/models/user.model';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { MatchStore } from '../../../../core/stores/match.store';
import { AuthStore } from '../../../../core/stores/auth.store';

import { Permission } from '../../../../core/permissions/permissions.model';
import { PermissionsService } from '../../../../core/services/permissions.service';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';

// Shared Components
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { FilterComponent } from '../../../../shared/components/filter/filter.component';
import { MatchCardComponent } from '../../../../shared/components/match-card/match-card.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InlineLoadingComponent } from '../../../../shared/components/inline-loading/inline-loading.component';
import { PendingStatusCardComponent } from '../../../../shared/components/pending-status-card/pending-status-card.component';


// Type-safe filter definition
type MatchFilterValue = 'all' | 'upcoming' | 'live' | 'finished' | 'cancelled';

interface MatchFilter {
    label: string;
    value: MatchFilterValue;
    icon?: string;
}

@Component({
    selector: 'app-matches-list',
    standalone: true,
    imports: [IconComponent,
        CommonModule,
        RouterModule,
        EmptyStateComponent,
        FilterComponent,
        MatchCardComponent,
        ButtonComponent,
        InlineLoadingComponent,
        PendingStatusCardComponent,
        HasPermissionDirective
    ],
    templateUrl: './matches-list.component.html',
    styleUrls: ['./matches-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})

export class MatchesListComponent implements OnInit, AfterViewInit, OnDestroy {
    private readonly matchService = inject(MatchService);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly uiFeedback = inject(UIFeedbackService);
    private readonly matchStore = inject(MatchStore);
    private readonly authStore = inject(AuthStore);
    private readonly layoutOrchestrator = inject(LayoutOrchestratorService);
    public readonly permissionsService = inject(PermissionsService);
    private readonly navService = inject(ContextNavigationService);
    public readonly Permission = Permission;
    // Signals State derived from Store
    matches = this.matchStore.matches;
    isLoading = this.matchStore.isLoading;

    selectedFilter = signal<MatchFilterValue>('all');

    currentUser = this.authStore.currentUser;
    userRole = this.authStore.userRole;
    isPending = computed(() => this.currentUser()?.status?.toLowerCase() === 'pending');

    // Expose enums to template
    MatchStatus = MatchStatus;
    MatchEventType = MatchEventType;

    // Modals State
    activeMatchId: string | null = null;
    activeMatch: Match | null = null;

    @ViewChild('filtersTemplate') filtersTemplate!: TemplateRef<unknown>;

    // Type-safe filters
    readonly filters: MatchFilter[] = [
        { label: 'الكل', value: 'all', icon: 'all_inclusive' },
        { label: 'القادمة', value: 'upcoming', icon: 'calendar_month' },
        { label: 'مباشر', value: 'live', icon: 'sensors' },
        { label: 'المنتهية', value: 'finished', icon: 'task_alt' },
        { label: 'الملغاة', value: 'cancelled', icon: 'block' }
    ];

    // Computed Filter Logic
    filteredMatches = computed(() => {
        const currentMatches = this.matches();
        const filter = this.selectedFilter();

        switch (filter) {
            case 'upcoming':
                // Include Scheduled, Postponed, and Rescheduled matches
                return currentMatches.filter(m =>
                    m.status === MatchStatus.SCHEDULED ||
                    m.status === MatchStatus.POSTPONED ||
                    m.status === MatchStatus.RESCHEDULED
                );
            case 'live':
                return currentMatches.filter(m => m.status === MatchStatus.LIVE);
            case 'finished':
                return currentMatches.filter(m => m.status === MatchStatus.FINISHED);
            case 'cancelled':
                return currentMatches.filter(m => m.status === MatchStatus.CANCELLED);
            default:
                return currentMatches;
        }
    });

    ngOnInit(): void {
        this.layoutOrchestrator.setTitle(this.pageTitle);
        this.layoutOrchestrator.setSubtitle(this.pageSubtitle);
        this.loadMatches();
    }

    ngAfterViewInit(): void {
        // Defer to avoid ExpressionChangedAfterItHasCheckedError
        queueMicrotask(() => {
            this.layoutOrchestrator.setFilters(this.filtersTemplate);
        });
        this.cdr.detectChanges();
    }

    ngOnDestroy(): void {
        this.layoutOrchestrator.reset();
    }

    refreshStatus(): void {
        this.matchStore.setLoading(true);
        this.authService.refreshUserProfile().subscribe({
            next: (user) => {
                this.matchStore.setLoading(false);
                if (user?.status?.toLowerCase() === 'active') {
                    this.uiFeedback.success('تم التفعيل', 'تم تفعيل حسابك بنجاح!');
                    this.loadMatches();
                } else {
                    this.uiFeedback.info('لا يزال قيد المراجعة', 'حسابك لا يزال قيد المراجعة من قبل الإدارة.');
                }
                this.cdr.detectChanges();
            },
            error: () => {
                this.matchStore.setLoading(false);
                this.uiFeedback.error('خطأ', 'فشل في تحديث حالة الحساب');
                this.cdr.detectChanges();
            }
        });
    }

    loadMatches(): void {
        this.matchStore.setLoading(true);

        const handleSuccess = (data: Match[]) => {
            this.matchStore.setMatches(data);
        };

        const handleError = () => {
            this.matchStore.setLoading(false);
            this.matchStore.setError('Failed to load matches');
        };

        if (this.permissionsService.has(Permission.MANAGE_TOURNAMENTS)) {
            this.matchService.getMatches().subscribe({ next: handleSuccess, error: handleError });

        } else {
            const teamId = this.currentUser()?.teamId;
            if (teamId) {
                this.matchService.getMatchesByTeam(teamId).subscribe({ next: handleSuccess, error: handleError });
            } else {
                this.matchStore.setLoading(false);
            }
        }
    }

    get pageTitle(): string {
        const role = this.userRole();
        if (!role) return 'المباريات';

        const titles: Partial<Record<UserRole, string>> = {
            [UserRole.ADMIN]: 'إدارة المباريات',
            [UserRole.TOURNAMENT_CREATOR]: 'إدارة المباريات',
            [UserRole.PLAYER]: 'مباريات الفريق'
        };
        return titles[role] || 'المباريات';
    }

    get pageSubtitle(): string {
        const role = this.userRole();
        if (!role) return '';

        const subtitles: Partial<Record<UserRole, string>> = {
            [UserRole.ADMIN]: 'إدارة جدول المباريات وتحديث النتائج المباشرة',
            [UserRole.TOURNAMENT_CREATOR]: 'إدارة جدول المباريات وتحديث النتائج المباشرة',
            [UserRole.PLAYER]: 'عرض نتائج المباريات السابقة والمواجهات القادمة في البطولة'
        };
        return subtitles[role] || '';
    }

    get emptyStateDescription(): string {
        return this.selectedFilter() === 'all'
            ? 'لا توجد أي مباريات مجدولة حالياً'
            : 'لا توجد مباريات تطابق هذا التصنيف حالياً';
    }

    getRoutePrefix(): string {
        const role = this.userRole();
        if (!role) return '/player';

        const prefixes: Partial<Record<UserRole, string>> = {
            [UserRole.ADMIN]: '/admin',
            [UserRole.TOURNAMENT_CREATOR]: '/creator',
            [UserRole.PLAYER]: '/player'
        };
        return prefixes[role] || '/player';
    }

    // Role checks
    isAdmin(): boolean { return this.userRole() === UserRole.ADMIN; }

    isCaptain(): boolean { return this.currentUser()?.teamRole === 'Captain'; }

    setFilter(filter: unknown): void {
        this.selectedFilter.set(filter as MatchFilterValue);
    }

    viewMatch(matchId: string): void {
        this.navService.navigateTo(['matches', matchId]);
    }

    // List Optimization
    trackById(_index: number, match: Match): string {
        return match.id;
    }

    // Admin actions
    updateScore(match: Match): void {
        this.navService.navigateTo(['matches', match.id]);
    }



    // ==========================================
    // Captain/Player Actions
    // ==========================================

    openChat(matchId: string): void {
        this.navService.navigateTo(['matches', matchId, 'chat']);
    }


}


