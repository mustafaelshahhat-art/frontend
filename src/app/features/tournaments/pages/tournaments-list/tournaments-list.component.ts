import { Component, OnInit, inject, ChangeDetectionStrategy, signal, computed, ViewChild, TemplateRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TournamentService } from '../../../../core/services/tournament.service';
import { TeamService } from '../../../../core/services/team.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Tournament, TournamentStatus } from '../../../../core/models/tournament.model';
import { UserRole } from '../../../../core/models/user.model';
import { TournamentStore } from '../../../../core/stores/tournament.store';
import { TeamStore } from '../../../../core/stores/team.store';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { AdminLayoutService } from '../../../../core/services/admin-layout.service';
import { CaptainLayoutService } from '../../../../core/services/captain-layout.service';

// Shared Components
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { FilterComponent } from '../../../../shared/components/filter/filter.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InlineLoadingComponent } from '../../../../shared/components/inline-loading/inline-loading.component';
import { TournamentCardComponent } from '../../components/tournament-card/tournament-card.component';
import { TeamRegistrationModalComponent } from '../../components/team-registration-modal/team-registration-modal.component';

// Type-safe filter definition
type TournamentFilterValue = 'all' | 'available' | 'active' | 'completed';

interface TournamentFilter {
    label: string;
    value: TournamentFilterValue;
}

@Component({
    selector: 'app-tournaments-list',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        EmptyStateComponent,
        FilterComponent,
        ButtonComponent,
        InlineLoadingComponent,
        TournamentCardComponent,
        TeamRegistrationModalComponent
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
    private readonly adminLayout = inject(AdminLayoutService);
    private readonly captainLayout = inject(CaptainLayoutService);

    // Dynamic layout service based on current route
    private get layoutService() {
        return this.router.url.startsWith('/captain') ? this.captainLayout : this.adminLayout;
    }

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

    // Compute if user's team is registered in ANY active/pending tournament
    isTeamBusy = computed(() => {
        const teamId = this.authService.getCurrentUser()?.teamId;
        if (!teamId) return false;

        // Return true if team is in ANY tournament with a non-rejected status
        return this.tournaments().some(t =>
            t.registrations?.some(r => r.teamId === teamId && r.status !== 'Rejected')
        );
    });

    ngOnInit(): void {
        this.layoutService.setTitle(this.isAdmin() ? 'إدارة البطولات' : 'البطولات المتاحة');
        this.layoutService.setSubtitle(this.isAdmin() ? 'مركز التحكم في البطولات والمسابقات' : 'تنافس مع الأفضل واصنع مجد فريقك');
        this.loadInitialData();
    }

    ngAfterViewInit(): void {
        // Defer to avoid ExpressionChangedAfterItHasCheckedError
        queueMicrotask(() => {
            this.layoutService.setActions(this.actionsTemplate);
            this.layoutService.setFilters(this.filtersTemplate);
        });
    }

    ngOnDestroy(): void {
        this.layoutService.reset();
    }

    // Registration Modal State
    selectedTournamentForRegistration: Tournament | null = null;
    isRegistrationModalVisible = false;

    // Role checks
    isAdmin(): boolean {
        return this.authService.hasRole(UserRole.ADMIN);
    }

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
        return team && user ? team.captainId === user.id : false;
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
    private loadInitialData(): void {
        this.tournamentStore.setLoading(true);

        // Load team details if user belongs to one
        const user = this.authService.getCurrentUser();
        if (user?.teamId) {
            this.teamService.getTeamById(user.teamId).subscribe({
                next: (team) => {
                    if (team) {
                        this.teamStore.upsertTeam(team);
                    }
                },
                error: () => {
                    // Keep empty store state on failure.
                }
            });
        }

        // Load tournaments into STORE (not local state)
        this.tournamentService.getTournaments().subscribe({
            next: (data) => {
                this.tournamentStore.setTournaments(data);
            },
            error: () => {
                this.tournamentStore.setLoading(false);
            }
        });
    }

    // List Optimization
    trackById(_index: number, item: Tournament): string {
        return item.id;
    }

    setFilter(filter: unknown): void {
        this.currentFilter.set(filter as TournamentFilterValue);
    }

    onSearchChange(query: string): void {
        this.searchQuery.set(query);
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
        this.router.navigate(['/admin/tournaments/new']);
    }

    viewDetails(tournament: Tournament): void {
        if (this.isAdmin()) {
            this.router.navigate(['/admin/tournaments', tournament.id]);
        } else if (this.hasTeam()) {
            this.router.navigate(['/captain/championships', tournament.id]);
        }
    }

    registerTeam(tournament: Tournament): void {
        // Check pre-conditions before opening modal
        const user = this.authService.getCurrentUser();
        if (!user || user.role !== UserRole.PLAYER) {
            this.uiFeedback.error('غير مصرح', 'يجب أن تكون لاعباً وصاحب فريق للتسجيل');
            return;
        }

        if (!user.teamId) {
            this.uiFeedback.error('خطأ', 'يجب إنشاء فريق أولاً');
            this.router.navigate(['/captain/my-team']);
            return;
        }

        if (this.isTeamBusy()) {
            this.uiFeedback.error('تنبيه', 'لا يمكنك التسجيل في أكثر من بطولة نشطة في نفس الوقت');
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
        return user.role === UserRole.PLAYER && !user.teamId;
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

