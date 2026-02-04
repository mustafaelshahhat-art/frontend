import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatchService } from '../../../../core/services/match.service';
import { Match, MatchStatus, MatchEventType } from '../../../../core/models/tournament.model';
import { AuthService } from '../../../../core/services/auth.service';
import { UserRole } from '../../../../core/models/user.model';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';

// Shared Components
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { EndMatchConfirmComponent } from '../../components/end-match-confirm/end-match-confirm.component';
import { FilterComponent } from '../../../../shared/components/filter/filter.component';
import { MatchEventModalComponent } from '../../components/match-event-modal/match-event-modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { MatchCardComponent } from '../../../../shared/components/match-card/match-card.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InlineLoadingComponent } from '../../../../shared/components/inline-loading/inline-loading.component';

// Type-safe filter definition
type MatchFilterValue = 'all' | 'upcoming' | 'live' | 'finished';

interface MatchFilter {
    label: string;
    value: MatchFilterValue;
    icon?: string;
}

@Component({
    selector: 'app-matches-list',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        EmptyStateComponent,
        EndMatchConfirmComponent,
        MatchEventModalComponent,
        FilterComponent,
        PageHeaderComponent,
        MatchCardComponent,
        ButtonComponent,
        InlineLoadingComponent
    ],
    templateUrl: './matches-list.component.html',
    styleUrls: ['./matches-list.component.scss']
})
export class MatchesListComponent implements OnInit {
    private readonly matchService = inject(MatchService);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly uiFeedback = inject(UIFeedbackService);

    matches: Match[] = [];
    isLoading = true;
    selectedFilter: MatchFilterValue = 'all';

    currentUser = this.authService.getCurrentUser();
    userRole = this.currentUser?.role || UserRole.CAPTAIN;

    // Expose enums to template
    MatchStatus = MatchStatus;
    MatchEventType = MatchEventType;

    // Modals State (Referee Specific)
    showEndMatchConfirm = false;
    showEventModal = false;
    activeMatchId: string | null = null;
    activeMatch: Match | null = null;

    // Type-safe filters
    readonly filters: MatchFilter[] = [
        { label: 'الكل', value: 'all', icon: 'all_inclusive' },
        { label: 'القادمة', value: 'upcoming', icon: 'calendar_month' },
        { label: 'مباشر', value: 'live', icon: 'sensors' },
        { label: 'المنتهية', value: 'finished', icon: 'task_alt' }
    ];

    ngOnInit(): void {
        this.loadMatches();
    }

    loadMatches(): void {
        this.isLoading = true;

        const handleSuccess = (data: Match[]) => {
            this.matches = data;
            this.isLoading = false;
            this.cdr.detectChanges();
        };

        const handleError = () => {
            this.isLoading = false;
            this.cdr.detectChanges();
        };

        if (this.userRole === UserRole.ADMIN) {
            this.matchService.getMatches().subscribe({ next: handleSuccess, error: handleError });
        } else if (this.userRole === UserRole.REFEREE) {
            this.matchService.getMatchesByReferee('ref1').subscribe({ next: handleSuccess, error: handleError });
        } else {
            this.matchService.getMatchesByTeam('team1').subscribe({ next: handleSuccess, error: handleError });
        }
    }

    get filteredMatches(): Match[] {
        switch (this.selectedFilter) {
            case 'upcoming':
                return this.matches.filter(m => m.status === MatchStatus.SCHEDULED);
            case 'live':
                return this.matches.filter(m => m.status === MatchStatus.LIVE);
            case 'finished':
                return this.matches.filter(m => m.status === MatchStatus.FINISHED);
            default:
                return this.matches;
        }
    }

    get pageTitle(): string {
        const titles: Record<UserRole, string> = {
            [UserRole.ADMIN]: 'إدارة المباريات',
            [UserRole.CAPTAIN]: 'مباريات الفريق',
            [UserRole.REFEREE]: 'أجندة المباريات',
            [UserRole.PLAYER]: 'مباريات الفريق'
        };
        return titles[this.userRole] || 'المباريات';
    }

    get pageSubtitle(): string {
        const subtitles: Record<UserRole, string> = {
            [UserRole.ADMIN]: 'إدارة جدول المباريات وتحديث النتائج المباشرة',
            [UserRole.CAPTAIN]: 'عرض نتائج المباريات السابقة والمواجهات القادمة في البطولة',
            [UserRole.REFEREE]: 'استعرض مباريات اليوم وقم بإدارتها باحترافية',
            [UserRole.PLAYER]: 'تابع مباريات فريقك'
        };
        return subtitles[this.userRole] || '';
    }

    get emptyStateDescription(): string {
        return this.selectedFilter === 'all'
            ? 'لا توجد أي مباريات مجدولة حالياً'
            : 'لا توجد مباريات تطابق هذا التصنيف حالياً';
    }

    getRoutePrefix(): string {
        const prefixes: Record<UserRole, string> = {
            [UserRole.ADMIN]: '/admin',
            [UserRole.CAPTAIN]: '/captain',
            [UserRole.REFEREE]: '/referee',
            [UserRole.PLAYER]: '/captain'
        };
        return prefixes[this.userRole] || '/captain';
    }

    // Role checks
    isAdmin(): boolean { return this.userRole === UserRole.ADMIN; }
    isReferee(): boolean { return this.userRole === UserRole.REFEREE; }
    isCaptain(): boolean { return this.userRole === UserRole.CAPTAIN; }

    setFilter(filter: string): void {
        this.selectedFilter = filter as MatchFilterValue;
    }

    viewMatch(matchId: string): void {
        this.router.navigate([this.getRoutePrefix(), 'matches', matchId]);
    }

    // Admin actions
    updateScore(match: Match): void {
        this.router.navigate(['/admin/matches', match.id]);
    }

    // ==========================================
    // Referee Specific Actions
    // ==========================================

    startMatch(match: Match): void {
        this.matchService.startMatch(match.id).subscribe({
            next: (updatedMatch) => {
                if (updatedMatch) {
                    const index = this.matches.findIndex(m => m.id === match.id);
                    if (index !== -1) this.matches[index] = { ...updatedMatch };
                }
                this.uiFeedback.success('تم البدء', 'تم بدء المباراة');
                this.cdr.detectChanges();
            },
            error: () => this.uiFeedback.error('خطأ', 'فشل في بدء المباراة')
        });
    }

    onEndMatchClick(match: Match): void {
        this.activeMatchId = match.id;
        this.showEndMatchConfirm = true;
    }

    onMatchEnded(updatedMatch: Match): void {
        if (updatedMatch) {
            const index = this.matches.findIndex(m => m.id === updatedMatch.id);
            if (index !== -1) this.matches[index] = { ...updatedMatch };
        }
        this.loadMatches();
        this.activeMatchId = null;
    }

    openEventModal(match: Match): void {
        this.activeMatch = match;
        this.activeMatchId = match.id;
        this.showEventModal = true;
    }

    onEventAdded(updatedMatch: Match): void {
        if (updatedMatch) {
            const index = this.matches.findIndex(m => m.id === updatedMatch.id);
            if (index !== -1) this.matches[index] = { ...updatedMatch };
        }
        this.activeMatch = null;
        this.activeMatchId = null;
    }
}
