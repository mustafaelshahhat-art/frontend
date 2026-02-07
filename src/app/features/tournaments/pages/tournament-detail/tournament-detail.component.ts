import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, TemplateRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TournamentService } from '../../../../core/services/tournament.service';
import { MatchService } from '../../../../core/services/match.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Tournament, TournamentStatus, Match, RegistrationStatus, TeamRegistration } from '../../../../core/models/tournament.model';
import { UserRole, UserStatus } from '../../../../core/models/user.model';
import { RealTimeUpdateService, SystemEvent } from '../../../../core/services/real-time-update.service';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { FilterComponent } from '../../../../shared/components/filter/filter.component';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { MatchCardComponent } from '../../../../shared/components/match-card/match-card.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { SmartImageComponent } from '../../../../shared/components/smart-image/smart-image.component';
import { TeamRegistrationModalComponent } from '../../components/team-registration-modal/team-registration-modal.component';
import { TableComponent, TableColumn } from '../../../../shared/components/table/table.component';

@Component({
    selector: 'app-tournament-detail',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        FilterComponent,
        PageHeaderComponent,
        CardComponent,
        BadgeComponent,
        ButtonComponent,
        MatchCardComponent,
        EmptyStateComponent,
        SmartImageComponent,
        TeamRegistrationModalComponent,
        TableComponent
    ],
    templateUrl: './tournament-detail.component.html',
    styleUrls: ['./tournament-detail.component.scss']
})
export class TournamentDetailComponent implements OnInit, AfterViewInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private tournamentService = inject(TournamentService);
    private matchService = inject(MatchService);
    private authService = inject(AuthService);
    private uiFeedback = inject(UIFeedbackService);
    private cdr = inject(ChangeDetectorRef);
    private realTimeUpdate = inject(RealTimeUpdateService);

    @ViewChild('rankTemplate') rankTemplate!: TemplateRef<any>;
    @ViewChild('teamTemplate') teamTemplate!: TemplateRef<any>;
    @ViewChild('formTemplate') formTemplate!: TemplateRef<any>;

    tournament: Tournament | null = null;
    matches: Match[] = [];
    isLoading = true;
    isBusyElsewhere = false;

    TournamentStatus = TournamentStatus;
    RegistrationStatus = RegistrationStatus;

    // Tabs
    tabs = [
        { value: 'info', label: 'عن البطولة' },
        { value: 'standings', label: 'جدول الترتيب' },
        { value: 'matches', label: 'المباريات' },
        { value: 'teams', label: 'الفرق المشاركة' }
    ];
    activeTab = 'info';

    // Standings Configuration
    tableColumns: TableColumn[] = [];

    standings: any[] = [];
    scorers: any[] = [];

    get rulesList(): string[] {
        if (!this.tournament?.rules) return [];
        return this.tournament.rules
            .split('\n')
            .map(r => r.trim())
            .filter(r => r.length > 0);
    }

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.loadData(id);
            this.setupRealTimeUpdates(id);
        } else {
            this.navigateBack();
        }
    }

    private setupRealTimeUpdates(id: string): void {
        this.realTimeUpdate.on(['TOURNAMENT_UPDATED', 'PAYMENT_APPROVED', 'PAYMENT_REJECTED']).subscribe((event: SystemEvent) => {
            if (event.metadata.TournamentId === id) {
                if (!this.isRegisterModalVisible) {
                    this.loadData(id);
                }
            }
        });

        // Listen for match status changes to refresh standings
        this.realTimeUpdate.on(['MATCH_STATUS_CHANGED']).subscribe(() => {
            if (!this.isRegisterModalVisible) {
                this.loadData(id);
            }
        });
    }

    ngAfterViewInit(): void {
        // Initialize columns with templates after view init
        this.tableColumns = [
            { key: 'rank', label: '#', sortable: false, width: '60px', template: this.rankTemplate },
            { key: 'team', label: 'الفريق', sortable: false, template: this.teamTemplate },
            { key: 'played', label: 'لعب', sortable: true },
            { key: 'won', label: 'فاز', sortable: true },
            { key: 'draw', label: 'تعادل', sortable: true },
            { key: 'lost', label: 'خسر', sortable: true },
            { key: 'gf', label: 'له', sortable: true },
            { key: 'ga', label: 'عليه', sortable: true },
            { key: 'gd', label: '+/-', sortable: true },
            { key: 'points', label: 'نقاط', sortable: true },
            { key: 'form', label: 'آخر 5', sortable: false, template: this.formTemplate }
        ];
        this.cdr.detectChanges();
    }

    // Role checks
    isAdmin(): boolean {
        return this.authService.hasRole(UserRole.ADMIN);
    }

    hasTeam(): boolean {
        return !!this.authService.getCurrentUser()?.teamId;
    }

    isCaptain(): boolean {
        return !!this.authService.getCurrentUser()?.isTeamOwner;
    }

    get isUserPending(): boolean {
        return this.authService.getCurrentUser()?.status === UserStatus.PENDING;
    }

    get isRegistered(): boolean {
        return !!this.myRegistration && this.myRegistration.status !== RegistrationStatus.REJECTED;
    }

    get myRegistration(): TeamRegistration | undefined {
        const teamId = this.authService.getCurrentUser()?.teamId;
        return this.tournament?.registrations?.find((r: TeamRegistration) => r.teamId === teamId);
    }

    // Match generation
    isGeneratingMatches = false;

    get canGenerateMatches(): boolean {
        if (!this.tournament) return false;
        // Can generate if: has registrations >= 2, no matches yet, tournament not cancelled
        const regCount = this.tournament.registrations?.length || 0;
        return regCount >= 2 && this.matches.length === 0 && this.tournament.status !== TournamentStatus.CANCELLED;
    }

    generateMatches(): void {
        if (!this.tournament || this.isGeneratingMatches) return;

        this.isGeneratingMatches = true;
        this.tournamentService.generateMatches(this.tournament.id).subscribe({
            next: (response) => {
                this.isGeneratingMatches = false;
                this.matches = response.matches || [];
                this.uiFeedback.success('تم بنجاح', response.message || 'تم توليد جدول المباريات');
                // Reload tournament data
                this.loadData(this.tournament!.id);
            },
            error: (err) => {
                this.isGeneratingMatches = false;
                this.uiFeedback.error('خطأ', err.error?.message || 'فشل توليد المباريات');
            }
        });
    }

    loadData(id: string): void {
        this.isLoading = true;
        this.tournamentService.getTournamentById(id).subscribe({
            next: (data) => {
                this.tournament = data || null;

                if (this.tournament) {
                    // Fetch matches
                    this.matchService.getMatchesByTournament(id).subscribe({
                        next: (matches) => {
                            this.matches = matches;
                            this.cdr.detectChanges();
                        }
                    });

                    // Fetch standings
                    this.tournamentService.getStandings(id).subscribe({
                        next: (standings) => {
                            // Map backend DTO to frontend structure if needed
                            this.standings = standings.map((s, index) => ({
                                teamId: s.teamId,
                                team: s.teamName,
                                teamLogoUrl: s.teamLogoUrl,
                                played: s.played,
                                won: s.won,
                                draw: s.drawn,
                                lost: s.lost,
                                gf: s.goalsFor,
                                ga: s.goalsAgainst,
                                gd: s.goalDifference,
                                points: s.points,
                                form: s.form,
                                rank: index + 1
                            }));
                            this.isLoading = false;
                            this.checkGlobalBusyStatus();
                            this.cdr.detectChanges();
                        },
                        error: () => {
                            // Standings might fail if no matches (handled gracefully)
                            this.isLoading = false;
                        }
                    });
                } else {
                    this.isLoading = false;
                    this.cdr.detectChanges();
                }
            },
            error: () => {
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    navigateBack(): void {
        if (this.isAdmin()) {
            this.router.navigate(['/admin/tournaments']);
        } else if (this.isCaptain()) {
            this.router.navigate(['/captain/championships']);
        }
    }

    getBackRoute(): string {
        if (this.isAdmin()) return '/admin/tournaments';
        if (this.isCaptain()) return '/captain/championships';
        return '/';
    }

    getStatusLabel(status: TournamentStatus | undefined): string {
        if (!status) return '';
        const labels: Record<TournamentStatus, string> = {
            [TournamentStatus.DRAFT]: 'مسودة',
            [TournamentStatus.REGISTRATION_OPEN]: 'التسجيل مفتوح',
            [TournamentStatus.REGISTRATION_CLOSED]: 'التسجيل مغلق',
            [TournamentStatus.ACTIVE]: 'جارية الآن',
            [TournamentStatus.COMPLETED]: 'منتهية',
            [TournamentStatus.CANCELLED]: 'ملغاة'
        };
        return labels[status];
    }

    getRegStatusLabel(status: string): string {
        switch (status) {
            case 'PendingPaymentReview': return 'قيد المراجعة';
            case 'Approved': return 'مؤكد';
            case 'Rejected': return 'مرفوض';
            default: return status;
        }
    }

    getRegStatusType(status: string): 'primary' | 'gold' | 'danger' | 'info' | 'warning' | 'success' | 'muted' | 'neutral' | 'live' {
        switch (status) {
            case 'PendingPaymentReview': return 'info';
            case 'Approved': return 'success';
            case 'Rejected': return 'danger';
            default: return 'neutral';
        }
    }

    getProgressPercent(): number {
        if (!this.tournament?.maxTeams) return 0;
        return (this.tournament.currentTeams / this.tournament.maxTeams) * 100;
    }

    // Registration Modal
    // Replaced by shared component
    isRegisterModalVisible = false;

    // Modal Actions
    openRegisterModal(): void {
        this.isRegisterModalVisible = true;
        this.realTimeUpdate.setEditingState(true);
    }

    closeRegisterModal(): void {
        this.isRegisterModalVisible = false;
        this.realTimeUpdate.setEditingState(false);
        // Refresh data on close if needed or just wait for success event
    }

    onRegistrationSuccess(): void {
        this.closeRegisterModal();
        if (this.tournament) {
            this.loadData(this.tournament.id);
        }
    }

    // Admin actions
    editTournament(): void {
        if (this.tournament) {
            this.router.navigate(['/admin/tournaments/edit', this.tournament.id]);
        }
    }

    deleteTournament(): void {
        if (!this.tournament) return;

        this.uiFeedback.confirm(
            'حذف البطولة',
            `هل أنت متأكد من حذف بطولة "${this.tournament.name}"؟ هذا الإجراء سيؤدي لحذف كافة المباريات والتسجيلات المرتبطة بها ولا يمكن التراجع عنه.`,
            'حذف نهائي',
            'danger'
        ).subscribe(confirmed => {
            if (confirmed) {
                this.isLoading = true;
                this.tournamentService.deleteTournament(this.tournament!.id).subscribe({
                    next: () => {
                        this.uiFeedback.success('تم الحذف', 'تم حذف البطولة بنجاح');
                        this.router.navigate(['/admin/tournaments']);
                    },
                    error: (err) => {
                        this.isLoading = false;
                        this.uiFeedback.error('خطأ', err.error?.message || 'فشل في حذف البطولة');
                        this.cdr.detectChanges();
                    }
                });
            }
        });
    }

    toggleStatus(): void {
        if (!this.tournament) return;

        this.isLoading = true;

        if (this.tournament.status === TournamentStatus.REGISTRATION_OPEN) {
            // Closing Registration - Use dedicated endpoint
            this.tournamentService.closeRegistration(this.tournament.id).subscribe({
                next: (updatedTournament) => {
                    this.tournament = updatedTournament;
                    this.isLoading = false;
                    this.uiFeedback.success('تم التحديث', 'تم إغلاق التسجيل بنجاح');
                    this.cdr.detectChanges();
                },
                error: (err) => {
                    this.isLoading = false;
                    this.uiFeedback.error('خطأ', 'فشل إغلاق التسجيل: ' + (err.error?.message || 'خطأ غير معروف'));
                    this.cdr.detectChanges();
                }
            });
        } else {
            // Re-opening or other status change - Use generic update
            const newStatus = TournamentStatus.REGISTRATION_OPEN;
            this.tournamentService.updateTournament(this.tournament.id, { status: newStatus }).subscribe({
                next: (updatedTournament) => {
                    this.tournament = updatedTournament;
                    this.isLoading = false;
                    this.uiFeedback.success('تم التحديث', `تم تغيير حالة البطولة إلى: ${this.getStatusLabel(newStatus)}`);
                    this.cdr.detectChanges();
                },
                error: (err) => {
                    this.isLoading = false;
                    this.uiFeedback.error('خطأ', 'فشل تغيير حالة البطولة: ' + (err.error?.message || 'خطأ غير معروف'));
                    this.cdr.detectChanges();
                }
            });
        }
    }

    // Captain actions
    registerTeam(): void {
        if (this.tournament) {
            this.openRegisterModal();
        }
    }

    // Navigation
    viewMatch(matchId: string): void {
        if (this.isAdmin()) {
            this.router.navigate(['/admin/matches', matchId]);
        } else if (this.hasTeam()) {
            this.router.navigate(['/captain/matches', matchId]);
        }
    }

    checkGlobalBusyStatus(): void {
        const teamId = this.authService.getCurrentUser()?.teamId;
        if (!teamId) return;

        this.tournamentService.getTournaments().subscribe(list => {
            if (!this.tournament) return;
            this.isBusyElsewhere = list.some(t =>
                t.id !== this.tournament?.id &&
                t.registrations?.some(r => r.teamId === teamId && r.status !== 'Rejected')
            );
            this.cdr.detectChanges();
        });
    }



}
