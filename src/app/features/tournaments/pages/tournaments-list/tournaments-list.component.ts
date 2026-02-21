import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { Component, OnInit, inject, ChangeDetectionStrategy, signal, computed, ViewChild, TemplateRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ContextNavigationService } from '../../../../core/navigation/context-navigation.service';
import { TournamentService } from '../../../../core/services/tournament.service';
import { TeamService } from '../../../../core/services/team.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Tournament, TournamentStatus } from '../../../../core/models/tournament.model';
import { UserRole } from '../../../../core/models/user.model';
import { TournamentStore } from '../../../../core/stores/tournament.store';
import { TeamStore } from '../../../../core/stores/team.store';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { LayoutOrchestratorService } from '../../../../core/services/layout-orchestrator.service';
import { PermissionsService } from '../../../../core/services/permissions.service';
import { firstValueFrom } from 'rxjs';


// Shared Components
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { FilterComponent } from '../../../../shared/components/filter/filter.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InlineLoadingComponent } from '../../../../shared/components/inline-loading/inline-loading.component';
import { TournamentCardComponent } from '../../components/tournament-card/tournament-card.component';
import { TeamRegistrationModalComponent } from '../../components/team-registration-modal/team-registration-modal.component';
import { Permission } from '../../../../core/permissions/permissions.model';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { LoadMoreComponent } from '../../../../shared/components/load-more/load-more.component';
import { createClientLoadMore, PaginationSource } from '../../../../shared/data-access/paginated-data-source';

// Type-safe filter definition
type TournamentFilterValue = 'all' | 'available' | 'active' | 'completed';

interface TournamentFilter {
    label: string;
    value: TournamentFilterValue;
    [key: string]: unknown;
}

@Component({
    selector: 'app-tournaments-list',
    standalone: true,
    imports: [IconComponent,
        CommonModule,
        RouterModule,
        EmptyStateComponent,
        FilterComponent,
        ButtonComponent,
        InlineLoadingComponent,
        TournamentCardComponent,
        TeamRegistrationModalComponent,
        HasPermissionDirective,
        LoadMoreComponent
    ],
    templateUrl: './tournaments-list.component.html',
    styleUrls: ['./tournaments-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TournamentsListComponent implements OnInit, AfterViewInit, OnDestroy {
    private readonly tournamentService = inject(TournamentService);
    private readonly teamService = inject(TeamService);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly uiFeedback = inject(UIFeedbackService);
    private readonly tournamentStore = inject(TournamentStore);
    private readonly teamStore = inject(TeamStore);
    private readonly layoutOrchestrator = inject(LayoutOrchestratorService);
    public readonly permissionsService = inject(PermissionsService);
    private readonly navService = inject(ContextNavigationService);

    AppPermission = Permission;

    @ViewChild('actions') actionsTemplate!: TemplateRef<unknown>;
    @ViewChild('filtersRef') filtersTemplate!: TemplateRef<unknown>;

    // Signals State
    // ✅ FIXED: Bind directly to TournamentStore instead of local state
    tournaments = this.tournamentStore.tournaments;
    isLoading = this.tournamentStore.isLoading;
    registeredTournaments = signal<string[]>([]); // This will need to be re-evaluated if registration status is managed differently
    searchQuery = signal<string>('');
    currentFilter = signal<TournamentFilterValue>('all');

    // Type-safe filters
    readonly filters: TournamentFilter[] = [
        { label: 'الكل', value: 'all' },
        { label: 'متاحة للتسجيل', value: 'available' },
        { label: 'جارية', value: 'active' },
        { label: 'مكتملة', value: 'completed' }
    ];

    // Computed Filter Logic
    filteredTournaments = computed(() => {
        let result = this.tournaments();
        const filter = this.currentFilter();
        const query = this.searchQuery().toLowerCase().trim();

        // Apply status filter
        if (filter !== 'all') {
            switch (filter) {
                case 'available':
                    result = result.filter(t => t.status === TournamentStatus.REGISTRATION_OPEN);
                    break;
                case 'active':
                    result = result.filter(t => t.status === TournamentStatus.ACTIVE);
                    break;
                case 'completed':
                    result = result.filter(t => t.status === TournamentStatus.COMPLETED);
                    break;
            }
        }

        // Apply search filter
        if (query) {
            result = result.filter(t =>
                t.name.toLowerCase().includes(query) ||
                t.description.toLowerCase().includes(query)
            );
        }

        return result;
    });

    // Load-more pagination — progressively reveals filtered tournaments
    pager: PaginationSource<Tournament> = createClientLoadMore(this.filteredTournaments, { pageSize: 12 });

    async ngOnInit(): Promise<void> {
        const isAdminView = this.permissionsService.has(Permission.MANAGE_TOURNAMENTS);
        const title = isAdminView ? 'إدارة البطولات' : 'البطولات المتاحة';
        const subtitle = isAdminView ? 'مركز التحكم في البطولات والمسابقات' : 'تنافس مع الأفضل واصنع مجد فريقك';
        this.layoutOrchestrator.setTitle(title);
        this.layoutOrchestrator.setSubtitle(subtitle);

        // Load tournaments immediately — don't block on profile refresh
        this.loadInitialData();
        // Refresh profile in the background (non-blocking) to pick up latest teamId
        this.authService.refreshUserProfile().subscribe();
    }

    ngAfterViewInit(): void {
        // Defer to avoid ExpressionChangedAfterItHasCheckedError
        queueMicrotask(() => {
            this.layoutOrchestrator.setActions(this.actionsTemplate);
            this.layoutOrchestrator.setFilters(this.filtersTemplate);
        });
    }

    ngOnDestroy(): void {
        this.layoutOrchestrator.reset();
    }

    // Registration Modal State
    selectedTournamentForRegistration: Tournament | null = null;
    isRegistrationModalVisible = false;

    // Role checks
    // Team State from Store
    myTeam = computed(() => {
        const teamId = this.authService.getCurrentUser()?.teamId;
        if (!teamId) {
            return null;
        }

        return this.teamStore.getTeamById(teamId) || null;
    });

    // Derived State
    isCaptain = computed(() => {
        const team = this.myTeam();
        const user = this.authService.getCurrentUser();
        return team && user ? team.players.some(p => p.userId === user.id && p.teamRole === 'Captain') : false;
    });

    // Check if user has a team (proxy for "Captain" UI section access)
    hasTeam(): boolean {
        return !!this.authService.getCurrentUser()?.teamId;
    }

    // Check if team is disabled
    isTeamDisabled = computed(() => {
        const team = this.myTeam();
        return team ? team.isActive === false : false;
    });

    // ✅ FIXED: Load data ONCE on init, populate TournamentStore
    private async loadInitialData(): Promise<void> {
        // Clear stale data to prevent wrong tournaments flashing before the fresh response arrives
        this.tournamentStore.resetAndLoad();

        const user = this.authService.getCurrentUser();

        // Parallelize team fetch + tournament fetch for faster loading
        const teamPromise = (user?.teamId)
            ? firstValueFrom(this.teamService.getTeamById(user.teamId)).then(team => {
                if (team) this.teamStore.upsertTeam(team);
            }).catch(() => { /* Keep empty store state on failure */ })
            : Promise.resolve();

        const tournamentPromise = firstValueFrom(this.tournamentService.getTournaments()).then(data => {
            this.tournamentStore.setTournaments(data);
        }).catch(() => {
            this.tournamentStore.setLoading(false);
        });

        await Promise.all([teamPromise, tournamentPromise]);
    }

    // List Optimization
    trackById(_index: number, item: Tournament): string {
        return item.id;
    }

    setFilter(filter: unknown): void {
        this.currentFilter.set(filter as TournamentFilterValue);
        this.pager.refresh();
    }

    onSearchChange(query: string): void {
        this.searchQuery.set(query);
        this.pager.refresh();
    }

    isRegistered(id: string): boolean {
        return this.registeredTournaments().includes(id);
    }

    register(tournament: Tournament): void {
        // Redundant method legacy support if any HTML references it directly
        this.registerTeam(tournament);
    }

    unregister(): void {
        // API does not support unregistering by captain directly currently.
        this.uiFeedback.info('تنبيه', 'يرجى التواصل مع الإدارة لإلغاء التسجيل');
    }

    // Navigation
    createNewTournament(): void {
        this.navService.navigateTo('tournaments/new');
    }

    viewDetails(tournament: Tournament): void {
        const path = 'tournaments';
        this.navService.navigateTo([path, tournament.id]);
    }

    registerTeam(tournament: Tournament): void {
        // Check pre-conditions before opening modal
        if (!this.permissionsService.has(Permission.REGISTER_TOURNAMENT)) {
            this.uiFeedback.error('غير مصرح', 'يجب أن تكون لاعباً وصاحب فريق للتسجيل');
            return;
        }

        const user = this.authService.getCurrentUser();
        if (!user?.teamId) {
            this.uiFeedback.error('فريق مطلوب', 'يجب إنشاء فريق أولاً قبل التسجيل في البطولة.');
            this.navService.navigateTo('team');
            return;
        }

        if (this.isTeamDisabled()) {
            this.uiFeedback.error('تنبيه', 'لا يمكن للفريق المعطل المشاركة في أي أنشطة تنافسية.');
            return;
        }

        this.selectedTournamentForRegistration = tournament;
        this.isRegistrationModalVisible = true;
    }

    closeRegistrationModal(): void {
        this.isRegistrationModalVisible = false;
        this.selectedTournamentForRegistration = null;
    }

    onRegistrationSuccess(): void {
        this.closeRegistrationModal();
        this.uiFeedback.success('تم التسجيل', 'تم إرسال طلبك بنجاح');
        // ✅ FIXED: NO manual reload - tournament will update via SignalR → TournamentStore
    }

    // Check if user is a player but has no team (neither owner nor member)
    isPlayerWithoutTeam(): boolean {
        const user = this.authService.getCurrentUser();
        if (!user) return false;
        return this.permissionsService.has(Permission.REGISTER_TOURNAMENT) && !user.teamId;
    }

    // Contextual empty filter message
    getEmptyFilterMessage(): string {
        switch (this.currentFilter()) {
            case 'available':
                return 'لا توجد بطولات مفتوحة للتسجيل حالياً. جرب تصفح البطولات الجارية أو المكتملة.';
            case 'active':
                return 'لا توجد بطولات جارية في الوقت الحالي. ترقب البطولات القادمة!';
            case 'completed':
                return 'لم تنتهِ أي بطولات بعد. تابع البطولات الجارية لمعرفة النتائج.';
            default:
                return 'لا توجد بطولات تطابق البحث.';
        }
    }
}

