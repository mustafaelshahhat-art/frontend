import { Component, OnInit, inject, ChangeDetectorRef, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TournamentService } from '../../../../core/services/tournament.service';
import { TeamService } from '../../../../core/services/team.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Tournament, TournamentStatus } from '../../../../core/models/tournament.model';
import { UserRole } from '../../../../core/models/user.model';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';

// Shared Components
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { FilterComponent } from '../../../../shared/components/filter/filter.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { SearchComponent } from '../../../../shared/components/search/search.component';
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
        PageHeaderComponent,
        ButtonComponent,
        SearchComponent,
        InlineLoadingComponent,
        TournamentCardComponent,
        TeamRegistrationModalComponent
    ],
    templateUrl: './tournaments-list.component.html',
    styleUrls: ['./tournaments-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TournamentsListComponent implements OnInit {
    private readonly tournamentService = inject(TournamentService);
    private readonly teamService = inject(TeamService);
    private readonly authService = inject(AuthService);
    private readonly uiFeedback = inject(UIFeedbackService);
    private readonly router = inject(Router);
    private readonly cdr = inject(ChangeDetectorRef);

    // Signals State
    tournaments = signal<Tournament[]>([]);
    registeredTournaments = signal<string[]>([]);
    isLoading = signal<boolean>(false);
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
        this.loadTournaments();
    }

    // Registration Modal State
    selectedTournamentForRegistration: Tournament | null = null;
    isRegistrationModalVisible = false;

    // Role checks
    isAdmin(): boolean {
        return this.authService.hasRole(UserRole.ADMIN);
    }

    // Team State
    myTeam = signal<any | null>(null);

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

    loadTournaments(): void {
        this.isLoading.set(true);

        // Load team details if user belongs to one
        const user = this.authService.getCurrentUser();
        if (user?.teamId) {
            this.teamService.getTeamById(user.teamId).subscribe({
                next: (team) => this.myTeam.set(team || null),
                error: () => this.myTeam.set(null)
            });
        }

        this.tournamentService.getTournaments().subscribe({
            next: (data) => {
                this.tournaments.set(data);
                this.isLoading.set(false);
            },
            error: () => {
                this.isLoading.set(false);
            }
        });
    }

    // List Optimization
    trackById(index: number, item: Tournament): string {
        return item.id;
    }

    setFilter(filter: string): void {
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

    unregister(id: string): void {
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
        this.uiFeedback.success('تم التسجيل', 'تم إرسال طلبك بنجاح');
        this.loadTournaments(); // Refresh list to update status/buttons
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
