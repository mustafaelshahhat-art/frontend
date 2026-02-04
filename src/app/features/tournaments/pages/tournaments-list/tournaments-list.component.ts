import { Component, OnInit, inject, ChangeDetectorRef, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TournamentService } from '../../../../core/services/tournament.service';
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
        TournamentCardComponent
    ],
    templateUrl: './tournaments-list.component.html',
    styleUrls: ['./tournaments-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TournamentsListComponent implements OnInit {
    private readonly tournamentService = inject(TournamentService);
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

    ngOnInit(): void {
        this.loadTournaments();
    }

    // Role checks
    isAdmin(): boolean {
        return this.authService.hasRole(UserRole.ADMIN);
    }

    isCaptain(): boolean {
        return this.authService.hasRole(UserRole.CAPTAIN);
    }

    loadTournaments(): void {
        this.isLoading.set(true);
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
        this.registeredTournaments.update(current => [...current, tournament.id]);
        this.uiFeedback.success('تم التسجيل', 'تم التسجيل في البطولة بنجاح');
    }

    unregister(id: string): void {
        this.registeredTournaments.update(current => current.filter(t => t !== id));
        this.uiFeedback.info('تم الإلغاء', 'تم إلغاء التسجيل');
    }

    // Navigation
    createNewTournament(): void {
        this.router.navigate(['/admin/tournaments/new']);
    }

    viewDetails(tournament: Tournament): void {
        if (this.isAdmin()) {
            this.router.navigate(['/admin/tournaments', tournament.id]);
        } else if (this.isCaptain()) {
            this.router.navigate(['/captain/championships', tournament.id]);
        }
    }

    registerTeam(tournament: Tournament): void {
        this.router.navigate(['/captain/championships/register', tournament.id]);
    }
}
