import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatchService } from '../../core/services/match.service';
import { Match, MatchStatus, MatchEventType } from '../../core/models/tournament.model';
import { UIFeedbackService } from '../../shared/services/ui-feedback.service';
import { EndMatchConfirmComponent } from '../../features/matches/components/end-match-confirm/end-match-confirm.component';
import { MatchEventModalComponent } from '../../features/matches/components/match-event-modal/match-event-modal.component';
import { MatchCardComponent } from '../../shared/components/match-card/match-card.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { WelcomeCardComponent } from '../../shared/components/welcome-card/welcome-card.component';

@Component({
    selector: 'app-referee-dashboard',
    standalone: true,
    imports: [CommonModule, EndMatchConfirmComponent, MatchEventModalComponent, WelcomeCardComponent, StatCardComponent, MatchCardComponent],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class RefereeDashboardComponent implements OnInit {
    private router = inject(Router);
    private matchService = inject(MatchService);
    private uiFeedback = inject(UIFeedbackService);

    stats = [
        { label: 'مباريات اليوم', value: '2', icon: 'today', colorClass: 'primary' },
        { label: 'إجمالي المباريات', value: '15', icon: 'history', colorClass: 'info' },
        { label: 'تقارير معلقة', value: '1', icon: 'description', colorClass: 'gold' },
        { label: 'التقييم', value: '4.8', icon: 'star', colorClass: 'info' }
    ];

    todayMatches: Match[] = [];
    MatchStatus = MatchStatus;
    MatchEventType = MatchEventType;

    // Modals State
    showEndMatchConfirm = false;
    showEventModal = false;
    activeMatchId: string | null = null;
    activeMatch: Match | null = null;

    ngOnInit(): void {
        this.loadMatches();
    }

    loadMatches(): void {
        // In a real app, we would filter by referee ID and date
        this.matchService.getMatches().subscribe(matches => {
            // Mock: Filter matches that are scheduled or live, assuming current referee
            this.todayMatches = matches.filter(m =>
                m.status === MatchStatus.SCHEDULED || m.status === MatchStatus.LIVE
            );
        });
    }

    startMatch(matchId: string): void {
        this.matchService.startMatch(matchId).subscribe({
            next: (updatedMatch) => {
                this.uiFeedback.success('تم بنجاح', 'تم بدء المباراة بنجاح');
                // Update local list to reflect status change immediately
                const index = this.todayMatches.findIndex(m => m.id === matchId);
                if (index !== -1 && updatedMatch) {
                    this.todayMatches[index] = { ...updatedMatch };
                }
            },
            error: () => this.uiFeedback.error('خطأ', 'فشل في بدء المباراة')
        });
    }

    // End Match Flow
    onEndMatchClick(matchId: string): void {
        this.activeMatchId = matchId;
        this.showEndMatchConfirm = true;
    }

    onMatchEnded(updatedMatch: Match): void {
        const index = this.todayMatches.findIndex(m => m.id === this.activeMatchId);
        if (index !== -1 && updatedMatch) {
            this.todayMatches[index] = { ...updatedMatch };
        }
        this.loadMatches();
        this.activeMatchId = null;
    }

    // Add Event Flow
    openEventModal(match: Match): void {
        this.activeMatch = match;
        this.activeMatchId = match.id;
        this.showEventModal = true;
    }

    onEventAdded(updatedMatch: Match): void {
        const index = this.todayMatches.findIndex(m => m.id === this.activeMatchId);
        if (index !== -1 && updatedMatch) {
            this.todayMatches[index] = { ...updatedMatch };
        }
        this.activeMatch = null;
        this.activeMatchId = null;
    }

    goToMatchDetail(matchId: string): void {
        this.router.navigate(['/referee/matches', matchId]);
    }
}
