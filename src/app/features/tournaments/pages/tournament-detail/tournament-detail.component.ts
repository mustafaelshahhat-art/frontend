import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, TemplateRef, AfterViewInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TournamentService } from '../../../../core/services/tournament.service';
import { MatchService } from '../../../../core/services/match.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Tournament, TournamentStatus, Match, MatchStatus, RegistrationStatus, TeamRegistration, Goal } from '../../../../core/models/tournament.model';
import { UserRole, UserStatus } from '../../../../core/models/user.model';
import { TournamentStore } from '../../../../core/stores/tournament.store';
import { MatchStore } from '../../../../core/stores/match.store';
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
import { ObjectionModalComponent } from '../../../matches/components/objection-modal/objection-modal.component';
import { TableComponent, TableColumn } from '../../../../shared/components/table/table.component';
import { PermissionsService } from '../../../../core/services/permissions.service';
import { Permission } from '../../../../core/permissions/permissions.model';
import { AdminLayoutService } from '../../../../core/services/admin-layout.service';
import { CaptainLayoutService } from '../../../../core/services/captain-layout.service';
import { RefereeLayoutService } from '../../../../core/services/referee-layout.service';

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
        ObjectionModalComponent,
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
    private tournamentStore: TournamentStore = inject(TournamentStore);
    private matchStore: MatchStore = inject(MatchStore);
    private permissionsService = inject(PermissionsService);
    private adminLayout = inject(AdminLayoutService);
    private captainLayout = inject(CaptainLayoutService);
    private refereeLayout = inject(RefereeLayoutService);

    @ViewChild('rankTemplate') rankTemplate!: TemplateRef<any>;
    @ViewChild('teamTemplate') teamTemplate!: TemplateRef<any>;
    @ViewChild('formTemplate') formTemplate!: TemplateRef<any>;

    // Signals
    tournamentId = signal<string | null>(null);
    isLoading = signal<boolean>(true);

    // Derived State
    tournament = computed(() => {
        const id = this.tournamentId();
        return id ? this.tournamentStore.getTournamentById(id) || null : null;
    });

    tournamentMatches = computed(() => {
        const id = this.tournamentId();
        return id ? (this.matchStore as any).matches().filter((m: Match) => m.tournamentId === id) : [];
    });

    // Compute Standings Client-Side for Real-Time Accuracy
    standings = computed(() => {
        const ms = this.tournamentMatches().filter((m: Match) => m.status === 'Finished');
        const teamsMap = new Map<string, any>();

        // Initialize teams from Tournament registrations if available? 
        // Or just build from matches. Better to use registrations to include 0-game teams.
        // But registrations are on Tournament object.
        const t = this.tournament();
        if (t?.registrations) {
            t.registrations.filter((r: TeamRegistration) =>
                r.status === RegistrationStatus.APPROVED ||
                r.status === RegistrationStatus.ELIMINATED ||
                r.status === RegistrationStatus.WITHDRAWN
            ).forEach((r: TeamRegistration) => {
                teamsMap.set(r.teamId, {
                    teamId: r.teamId,
                    team: r.teamName,
                    teamLogoUrl: r.teamLogoUrl || '', // Assuming logo is available
                    played: 0, won: 0, draw: 0, lost: 0,
                    gf: 0, ga: 0, gd: 0, points: 0,
                    form: []
                });
            });
        }

        ms.forEach((m: Match) => {
            // Home
            if (!teamsMap.has(m.homeTeamId)) return; // Should not happen
            const home = teamsMap.get(m.homeTeamId);
            home.played++;
            home.gf += m.homeScore;
            home.ga += m.awayScore;

            // Away
            if (!teamsMap.has(m.awayTeamId)) return;
            const away = teamsMap.get(m.awayTeamId);
            away.played++;
            away.gf += m.awayScore;
            away.ga += m.homeScore;

            if (m.homeScore > m.awayScore) {
                home.won++; home.points += 3; home.form.push('W');
                away.lost++; away.form.push('L');
            } else if (m.homeScore < m.awayScore) {
                away.won++; away.points += 3; away.form.push('W');
                home.lost++; home.form.push('L');
            } else {
                home.draw++; home.points += 1; home.form.push('D');
                away.draw++; away.points += 1; away.form.push('D');
            }
        });

        // Calculate GD and trim form
        const result = Array.from(teamsMap.values()).map((t: any) => {
            t.gd = t.gf - t.ga;
            t.form = t.form.slice(-5); // Last 5
            return t;
        });

        // Sort: Points DESC, GD DESC, GF DESC
        result.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.gd !== a.gd) return b.gd - a.gd;
            return b.gf - a.gf;
        });

        // Add Rank
        return result.map((t, index) => ({ ...t, rank: index + 1 }));
    });

    activeMatch = signal<Match | null>(null);
    showObjectionModal = signal(false);

    isBusyElsewhere = false;

    TournamentStatus = TournamentStatus;
    RegistrationStatus = RegistrationStatus;
    MatchStatus = MatchStatus;
    Permission = Permission;

    // Tabs
    tabs = [
        { value: 'info', label: 'عن البطولة' },
        { value: 'standings', label: 'جدول الترتيب' },
        { value: 'matches', label: 'المباريات' },
        { value: 'teams', label: 'الفرق المشاركة' }
    ];
    activeTab = 'info';

    tableColumns: TableColumn[] = [];
    scorers = computed(() => {
        const ms = this.tournamentMatches() as any[];
        const playerGoals = new Map<string, { name: string, team: string, goals: number, teamId: string }>();

        ms.forEach((m: any) => {
            if (m.goals && Array.isArray(m.goals)) {
                m.goals.forEach((g: any) => {
                    const key = g.playerId;
                    if (!playerGoals.has(key)) {
                        playerGoals.set(key, {
                            name: g.playerName,
                            team: g.teamId === m.homeTeamId ? m.homeTeamName : m.awayTeamName,
                            goals: 0,
                            teamId: g.teamId
                        });
                    }
                    playerGoals.get(key)!.goals++;
                });
            }
        });

        return Array.from(playerGoals.values())
            .sort((a, b) => b.goals - a.goals)
            .slice(0, 10);
    });

    get rulesList(): string[] {
        const t = this.tournament();
        if (!t?.rules) return [];
        return t.rules
            .split('\n')
            .map(r => r.trim())
            .filter(r => r.length > 0);
    }

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.tournamentId.set(id);
            this.loadInitialData(id);
        } else {
            this.navigateBack();
        }
    }

    private updateLayout(): void {
        const t = this.tournament();
        if (!t) return;

        const layout = this.getLayout();
        if (layout) {
            layout.setTitle(t.name || 'تفاصيل البطولة');
            layout.setSubtitle(t.description || '');
            layout.setBackAction(() => this.navigateBack());
        }
    }

    private getLayout(): any {
        if (this.isAdmin()) return this.adminLayout;
        if (this.isCaptain()) return this.captainLayout;
        if (this.authService.hasRole(UserRole.REFEREE)) return this.refereeLayout;
        return null;
    }

    ngOnDestroy(): void {
        this.adminLayout.reset();
        this.captainLayout.reset();
        this.refereeLayout.reset();
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
        const t = this.tournament();
        return t?.registrations?.find((r: TeamRegistration) => r.teamId === teamId);
    }

    // Match generation
    isGeneratingMatches = false;

    get canGenerateMatches(): boolean {
        const t = this.tournament();
        const m = this.tournamentMatches();
        if (!t) return false;
        // Can generate if: has registrations >= 2, no matches yet, tournament not cancelled
        const regCount = t.registrations?.length || 0;
        return regCount >= 2 && m.length === 0 && t.status !== TournamentStatus.CANCELLED;
    }

    generateMatches(): void {
        const t = this.tournament();
        if (!t || this.isGeneratingMatches) return;

        this.isGeneratingMatches = true;
        this.tournamentService.generateMatches(t.id).subscribe({
            next: (response) => {
                this.isGeneratingMatches = false;
                // Since generateMatches returns a message and potentially match data in some versions,
                // but usually RT event "MatchesGenerated" handles it.
                // However, the response might contain updated Tournament status.
                // Reload data to be safe and provide immediate feedback
                this.loadInitialData(t.id);
                this.uiFeedback.success('تم بنجاح', response.message || 'تم توليد جدول المباريات');
            },
            error: (err) => {
                this.isGeneratingMatches = false;
                this.uiFeedback.error('خطأ', err.error?.message || 'فشل توليد المباريات');
            }
        });
    }

    loadInitialData(id: string): void {
        this.isLoading.set(true);

        // 1. Load Tournament
        this.tournamentService.getTournamentById(id).subscribe({
            next: (data) => {
                if (data) {
                    this.tournamentStore.upsertTournament(data);
                    this.updateLayout();
                }

                // 2. Load Matches (Populate MatchStore)
                this.matchService.getMatchesByTournament(id).subscribe({
                    next: (matches) => {
                        // Smart update/add to store
                        matches.forEach((m: Match) => {
                            if (!this.matchStore.getMatchById(m.id)) {
                                this.matchStore.addMatch(m);
                            } else {
                                this.matchStore.updateMatch(m);
                            }
                        });
                        this.isLoading.set(false);
                        this.checkGlobalBusyStatus();
                    },
                    error: () => this.isLoading.set(false)
                });
            },
            error: () => this.isLoading.set(false)
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
            case 'Eliminated': return 'مقصى';
            case 'Withdrawn': return 'منسحب';
            default: return status;
        }
    }

    getRegStatusType(status: string): 'primary' | 'gold' | 'danger' | 'info' | 'warning' | 'success' | 'muted' | 'neutral' | 'live' {
        switch (status) {
            case 'PendingPaymentReview': return 'info';
            case 'Approved': return 'success';
            case 'Rejected': return 'danger';
            case 'Eliminated': return 'danger';
            case 'Withdrawn': return 'neutral';
            default: return 'neutral';
        }
    }

    getProgressPercent(): number {
        const t = this.tournament();
        if (!t?.maxTeams) return 0;
        return (t.currentTeams / t.maxTeams) * 100;
    }

    // Registration Modal
    // Replaced by shared component
    isRegisterModalVisible = false;

    // Modal Actions
    openRegisterModal(): void {
        this.isRegisterModalVisible = true;
    }

    closeRegisterModal(): void {
        this.isRegisterModalVisible = false;
    }

    onRegistrationSuccess(): void {
        this.closeRegisterModal();
        // Tournament updated via RealTime event
    }

    // Admin actions
    editTournament(): void {
        const t = this.tournament();
        if (t) {
            this.router.navigate(['/admin/tournaments/edit', t.id]);
        }
    }

    deleteTournament(): void {
        const t = this.tournament();
        if (!t) return;

        this.uiFeedback.confirm(
            'حذف البطولة',
            `هل أنت متأكد من حذف بطولة "${t.name}"؟ هذا الإجراء سيؤدي لحذف كافة المباريات والتسجيلات المرتبطة بها ولا يمكن التراجع عنه.`,
            'حذف نهائي',
            'danger'
        ).subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.isLoading.set(true);
                this.tournamentService.deleteTournament(t.id).subscribe({
                    next: () => {
                        this.uiFeedback.success('تم الحذف', 'تم حذف البطولة بنجاح');
                        this.router.navigate(['/admin/tournaments']);
                    },
                    error: (err) => {
                        this.isLoading.set(false);
                        this.uiFeedback.error('خطأ', err.error?.message || 'فشل في حذف البطولة');
                        this.cdr.detectChanges();
                    }
                });
            }
        });
    }

    toggleStatus(): void {
        const t = this.tournament();
        if (!t) return;

        this.isLoading.set(true);

        if (t.status === TournamentStatus.REGISTRATION_OPEN) {
            // Closing Registration - Use dedicated endpoint
            this.tournamentService.closeRegistration(t.id).subscribe({
                next: (updatedTournament) => {
                    // Update store manually or wait for event?
                    // Ideally generic update event.
                    // For responsiveness, manual update:
                    this.tournamentStore.updateTournament(updatedTournament);
                    this.isLoading.set(false);
                    this.uiFeedback.success('تم التحديث', 'تم إغلاق التسجيل بنجاح');
                    this.cdr.detectChanges();
                },
                error: (err) => {
                    this.isLoading.set(false);
                    this.uiFeedback.error('خطأ', 'فشل إغلاق التسجيل: ' + (err.error?.message || 'خطأ غير معروف'));
                    this.cdr.detectChanges();
                }
            });
        } else {
            // Re-opening or other status change - Use generic update
            const newStatus = TournamentStatus.REGISTRATION_OPEN;
            this.tournamentService.updateTournament(t.id, { status: newStatus }).subscribe({
                next: (updatedTournament) => {
                    this.tournamentStore.updateTournament(updatedTournament);
                    this.isLoading.set(false);
                    this.uiFeedback.success('تم التحديث', `تم تغيير حالة البطولة إلى: ${this.getStatusLabel(newStatus)}`);
                    this.cdr.detectChanges();
                },
                error: (err) => {
                    this.isLoading.set(false);
                    this.uiFeedback.error('خطأ', 'فشل تغيير حالة البطولة: ' + (err.error?.message || 'خطأ غير معروف'));
                    this.cdr.detectChanges();
                }
            });
        }
    }

    // Captain actions
    registerTeam(): void {
        const t = this.tournament();
        if (t) {
            this.openRegisterModal();
        }
    }

    // Navigation
    checkGlobalBusyStatus(): void {
        const teamId = this.authService.getCurrentUser()?.teamId;
        if (!teamId) return;

        // This is a check against "All Tournaments".
        // Use store if possible:
        const allTournaments = (this.tournamentStore as any).tournaments();
        // If store is empty, might need fetch. But this check is auxiliary.
        // Let's assume store has data or skip check for now to avoid refetch.
        // Or fetch once.
        const t = this.tournament();
        if (allTournaments.length > 0 && t) {
            this.isBusyElsewhere = allTournaments.some((other: any) =>
                other.id !== t.id &&
                other.registrations?.some((r: any) => r.teamId === teamId && r.status !== 'Rejected')
            );
        }
    }

    eliminateTeam(teamId: string, teamName: string): void {
        const t = this.tournament();
        if (!t) return;

        this.uiFeedback.confirm(
            'إقصاء الفريق',
            `هل أنت متأكد من إقصاء فريق "${teamName}" من البطولة؟ سيتم إنهاء جميع مبارياته القادمة كخسارة، لكنه سيبقى في جدول الترتيب.`,
            'إقصاء الفريق',
            'danger'
        ).subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.isLoading.set(true);
                this.tournamentService.eliminateTeam(t.id, teamId).subscribe({
                    next: (updatedTournament) => {
                        if (updatedTournament) {
                            this.tournamentStore.upsertTournament(updatedTournament);
                        } else {
                            // Fallback if no data returned
                            this.loadInitialData(t.id);
                        }
                        this.uiFeedback.success('تم الإقصاء', `تم إقصاء فريق ${teamName} بنجاح`);
                        this.isLoading.set(false);
                        this.cdr.detectChanges();
                    },
                    error: (err) => {
                        this.isLoading.set(false);
                        this.uiFeedback.error('خطأ', err.error?.message || 'فشل إقصاء الفريق');
                        this.cdr.detectChanges();
                    }
                });
            }
        });
    }

    // New action methods for match cards
    viewMatch(matchId: string): void {
        const prefix = this.isAdmin() ? '/admin' : '/captain';
        this.router.navigate([prefix, 'matches', matchId]);
    }

    openChat(matchId: string): void {
        const prefix = this.isAdmin() ? '/admin' : '/captain';
        this.router.navigate([prefix, 'matches', matchId, 'chat']);
    }

    updateScore(match: Match): void {
        this.router.navigate(['/admin/matches', match.id]);
    }

    submitObjection(matchId: string): void {
        const match = this.tournamentMatches().find((m: Match) => m.id === matchId);
        if (match) {
            this.activeMatch.set(match);
            this.showObjectionModal.set(true);
            this.cdr.detectChanges();
        }
    }

    canSubmitObjection(status: MatchStatus): boolean {
        return this.permissionsService.canSubmitObjection(status);
    }
}
