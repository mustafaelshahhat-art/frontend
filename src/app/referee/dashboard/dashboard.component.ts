import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
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
    private cdr = inject(ChangeDetectorRef);

    stats: { label: string, value: string, icon: string, colorClass: string }[] = [];

    todayMatches: Match[] = [];
    allMatches: Match[] = [];
    MatchStatus = MatchStatus;
    MatchEventType = MatchEventType;

    // Modals State
    showEndMatchConfirm = false;
    showEventModal = false;
    activeMatchId: string | null = null;
    activeMatch: Match | null = null;

    ngOnInit(): void {
        this.loadDashboardData();
    }

    loadDashboardData(): void {
        this.loadStats();
        this.loadMatches();
    }

    loadStats(): void {
        const finishedMatches = this.allMatches.filter(m => m.status === MatchStatus.FINISHED);
        const pendingReports = finishedMatches.filter(m => !m.refereeNotes || m.refereeNotes.trim() === '').length;

        this.stats = [
            { label: 'مباريات اليوم', value: this.todayMatches.length.toString(), icon: 'today', colorClass: 'primary' },
            { label: 'إجمالي المباريات', value: this.allMatches.length.toString(), icon: 'history', colorClass: 'info' },
            { label: 'تقارير معلقة', value: pendingReports.toString(), icon: 'description', colorClass: 'gold' },
            { label: 'التقييم', value: '5.0', icon: 'star', colorClass: 'info' }
        ];
    }

    loadMatches(): void {
        this.matchService.getMyMatches().subscribe({
            next: (matches) => {
                this.allMatches = matches;
                
                // Get today's date (normalized to start of day for comparison)
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                this.todayMatches = matches.filter(m => {
                    // Include matches that are actionable: Scheduled, Live, or Postponed
                    const isActionableStatus = m.status === MatchStatus.SCHEDULED || 
                                               m.status === MatchStatus.LIVE || 
                                               m.status === MatchStatus.POSTPONED;
                    
                    if (!isActionableStatus) return false;
                    
                    // For Live matches, always show (they're ongoing)
                    if (m.status === MatchStatus.LIVE) return true;
                    
                    // For Scheduled/Postponed, check if match date is today
                    const matchDate = m.scheduledDate ? new Date(m.scheduledDate) : (m.date ? new Date(m.date) : null);
                    if (matchDate) {
                        matchDate.setHours(0, 0, 0, 0);
                        return matchDate.getTime() === today.getTime();
                    }
                    
                    // If no date, include it (fallback for matches without date)
                    return true;
                });
                
                this.loadStats();
                this.cdr.detectChanges();
            },
            error: () => {
                this.todayMatches = [];
            }
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

    /**
     * Checks if a match is currently live - used for referee control visibility.
     */
    isMatchLive(match: Match): boolean {
        return match.status === MatchStatus.LIVE;
    }
}
