import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TournamentService } from '../../../core/services/tournament.service';
import { AuthService } from '../../../core/services/auth.service';
import { Tournament, TournamentStatus } from '../../../core/models/tournament.model';
import { UserRole } from '../../../core/models/user.model';
import { UIFeedbackService } from '../../services/ui-feedback.service';

// Shared Components
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { FilterComponent } from '../../components/filter/filter.component';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { ButtonComponent } from '../../components/button/button.component';
import { SearchComponent } from '../../components/search/search.component';
import { InlineLoadingComponent } from '../../components/inline-loading/inline-loading.component';
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
    styleUrls: ['./tournaments-list.component.scss']
})
export class TournamentsListComponent implements OnInit {
    private readonly tournamentService = inject(TournamentService);
    private readonly authService = inject(AuthService);
    private readonly uiFeedback = inject(UIFeedbackService);
    private readonly router = inject(Router);
    private readonly cdr = inject(ChangeDetectorRef);

    tournaments: Tournament[] = [];
    registeredTournaments: string[] = [];
    isLoading = false;
    searchQuery = '';

    // Type-safe filters
    readonly filters: TournamentFilter[] = [
        { label: 'الكل', value: 'all' },
        { label: 'متاحة للتسجيل', value: 'available' },
        { label: 'جارية', value: 'active' },
        { label: 'مكتملة', value: 'completed' }
    ];
    currentFilter: TournamentFilterValue = 'all';

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
        this.isLoading = true;
        this.tournamentService.getTournaments().subscribe({
            next: (data) => {
                this.tournaments = data;
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    get filteredTournaments(): Tournament[] {
        let result: Tournament[];

        // Apply status filter
        switch (this.currentFilter) {
            case 'available':
                result = this.tournaments.filter(t => t.status === TournamentStatus.REGISTRATION_OPEN);
                break;
            case 'active':
                result = this.tournaments.filter(t => t.status === TournamentStatus.ACTIVE);
                break;
            case 'completed':
                result = this.tournaments.filter(t => t.status === TournamentStatus.COMPLETED);
                break;
            default:
                result = [...this.tournaments];
        }

        // Apply search filter
        if (this.searchQuery.trim()) {
            const query = this.searchQuery.toLowerCase().trim();
            result = result.filter(t =>
                t.name.toLowerCase().includes(query) ||
                t.description.toLowerCase().includes(query)
            );
        }

        return result;
    }

    setFilter(filter: string): void {
        this.currentFilter = filter as TournamentFilterValue;
    }

    onSearchChange(query: string): void {
        this.searchQuery = query;
    }

    isRegistered(id: string): boolean {
        return this.registeredTournaments.includes(id);
    }

    register(tournament: Tournament): void {
        this.registeredTournaments.push(tournament.id);
        this.uiFeedback.success('تم التسجيل', 'تم التسجيل في البطولة بنجاح');
    }

    unregister(id: string): void {
        this.registeredTournaments = this.registeredTournaments.filter(t => t !== id);
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
