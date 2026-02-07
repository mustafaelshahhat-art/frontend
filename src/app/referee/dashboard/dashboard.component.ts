import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatchService } from '../../core/services/match.service';
import { AuthService } from '../../core/services/auth.service';
import { Match, MatchStatus, MatchEventType } from '../../core/models/tournament.model';
import { UIFeedbackService } from '../../shared/services/ui-feedback.service';
import { RealTimeUpdateService } from '../../core/services/real-time-update.service';
import { EndMatchConfirmComponent } from '../../features/matches/components/end-match-confirm/end-match-confirm.component';
import { MatchEventModalComponent } from '../../features/matches/components/match-event-modal/match-event-modal.component';
import { MatchCardComponent } from '../../shared/components/match-card/match-card.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { WelcomeCardComponent } from '../../shared/components/welcome-card/welcome-card.component';
import { PendingStatusCardComponent } from '../../shared/components/pending-status-card/pending-status-card.component';

@Component({
    selector: 'app-referee-dashboard',
    standalone: true,
    imports: [CommonModule, EndMatchConfirmComponent, MatchEventModalComponent, WelcomeCardComponent, StatCardComponent, MatchCardComponent, PendingStatusCardComponent],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class RefereeDashboardComponent implements OnInit {
    private router = inject(Router);
    private matchService = inject(MatchService);
    private authService = inject(AuthService);
    private uiFeedback = inject(UIFeedbackService);
    private cdr = inject(ChangeDetectorRef);
    private realTimeUpdate = inject(RealTimeUpdateService);

    currentUser = this.authService.getCurrentUser();
    isPending = this.currentUser?.status?.toLowerCase() === 'pending';

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
        this.setupRealTimeUpdates();
    }

    private setupRealTimeUpdates(): void {
        // Subscribe to relevant events
        this.realTimeUpdate.on(['MATCH_STATUS_CHANGED', 'MATCH_RESCHEDULED', 'MATCH_SCHEDULED']).subscribe(() => {
            if (!this.showEndMatchConfirm && !this.showEventModal) {
                this.loadDashboardData();
            }
        });

        // Handle user approval / blocking (if referee account status changes)
        this.realTimeUpdate.on(['USER_APPROVED', 'USER_BLOCKED']).subscribe(() => {
            this.refreshStatus();
        });
    }

    private updateEditingState(): void {
        this.realTimeUpdate.setEditingState(this.showEndMatchConfirm || this.showEventModal);
    }

    refreshStatus(): void {
        this.authService.refreshUserProfile().subscribe({
            next: (user) => {
                if (user) {
                    this.currentUser = user;
                    this.isPending = user.status?.toLowerCase() === 'pending';
                    this.cdr.detectChanges();
                }
            }
        });
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
                    // For Live matches, always show (they're ongoing)
                    if (m.status === MatchStatus.LIVE) return true;

                    // Support all non-finished matches for today
                    if (m.status === MatchStatus.FINISHED || m.status === MatchStatus.CANCELLED) return false;

                    // Check if real stored match date is today
                    if (m.date) {
                        const matchDate = new Date(m.date);
                        matchDate.setHours(0, 0, 0, 0);
                        return matchDate.getTime() === today.getTime();
                    }

                    return false;
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
        this.updateEditingState();
    }

    onMatchEnded(updatedMatch: Match): void {
        const index = this.todayMatches.findIndex(m => m.id === this.activeMatchId);
        if (index !== -1 && updatedMatch) {
            this.todayMatches[index] = { ...updatedMatch };
        }
        this.loadMatches();
        this.activeMatchId = null;
        this.showEndMatchConfirm = false;
        this.updateEditingState();
    }

    // Add Event Flow
    openEventModal(match: Match): void {
        this.activeMatch = match;
        this.activeMatchId = match.id;
        this.showEventModal = true;
        this.updateEditingState();
    }

    onEventAdded(updatedMatch: Match): void {
        const index = this.todayMatches.findIndex(m => m.id === this.activeMatchId);
        if (index !== -1 && updatedMatch) {
            this.todayMatches[index] = { ...updatedMatch };
        }
        this.activeMatch = null;
        this.activeMatchId = null;
        this.showEventModal = false;
        this.updateEditingState();
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
