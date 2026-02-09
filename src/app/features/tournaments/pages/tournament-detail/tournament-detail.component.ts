import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, TemplateRef, AfterViewInit, signal, computed, ChangeDetectionStrategy, OnDestroy, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TournamentService } from '../../../../core/services/tournament.service';
import { MatchService } from '../../../../core/services/match.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TournamentStatus, Match, MatchStatus, RegistrationStatus, TeamRegistration, Group, BracketDto, TournamentFormat, BracketRound, TournamentStanding } from '../../../../core/models/tournament.model';
import { UserRole, UserStatus } from '../../../../core/models/user.model';
import { TournamentStore } from '../../../../core/stores/tournament.store';
import { MatchStore } from '../../../../core/stores/match.store';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { FilterComponent } from '../../../../shared/components/filter/filter.component';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { MatchCardComponent } from '../../../../shared/components/match-card/match-card.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { SmartImageComponent } from '../../../../shared/components/smart-image/smart-image.component';
import { TeamRegistrationModalComponent } from '../../components/team-registration-modal/team-registration-modal.component';
import { ObjectionModalComponent } from '../../../matches/components/objection-modal/objection-modal.component';
import { KnockoutBracketComponent } from '../../components/knockout-bracket/knockout-bracket.component';
import { TableComponent, TableColumn } from '../../../../shared/components/table/table.component';
import { PermissionsService } from '../../../../core/services/permissions.service';
import { Permission } from '../../../../core/permissions/permissions.model';
import { AdminLayoutService } from '../../../../core/services/admin-layout.service';
import { CaptainLayoutService } from '../../../../core/services/captain-layout.service';
import { RefereeLayoutService } from '../../../../core/services/referee-layout.service';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';

@Component({
    selector: 'app-tournament-detail',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        FilterComponent,
        CardComponent,
        BadgeComponent,
        ButtonComponent,
        MatchCardComponent,
        EmptyStateComponent,
        SmartImageComponent,
        TeamRegistrationModalComponent,
        ObjectionModalComponent,
        TableComponent,
        KnockoutBracketComponent
    ],
    templateUrl: './tournament-detail.component.html',
    styleUrls: ['./tournament-detail.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TournamentDetailComponent implements OnInit, AfterViewInit, OnDestroy {
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
    private sanitizer = inject(DomSanitizer);

    // Expose Enums to template
    TournamentStatus = TournamentStatus;
    MatchStatus = MatchStatus;
    RegistrationStatus = RegistrationStatus;

    @HostBinding('style.--progress-val')
    get progressValStyle(): SafeStyle {
        return this.sanitizer.bypassSecurityTrustStyle(this.getProgressPercent().toString());
    }

    @ViewChild('rankTemplate') rankTemplate!: TemplateRef<unknown>;
    @ViewChild('teamTemplate') teamTemplate!: TemplateRef<unknown>;
    @ViewChild('formTemplate') formTemplate!: TemplateRef<unknown>;

    // Signals
    tournamentId = signal<string | null>(null);
    isLoading = signal<boolean>(true);
    groups = signal<Group[]>([]);
    bracket = signal<BracketDto | null>(null);
    activeGroup = signal<number | null>(null);
    teamGroupMap = signal<Map<string, number>>(new Map());

    // UI State Signals
    activeTab = signal<string>('info');
    activeMatch = signal<Match | null>(null);
    showObjectionModal = signal<boolean>(false);
    isGeneratingMatches = signal<boolean>(false);

    // Additional Properties
    isBusyElsewhere: boolean = false;
    standings = signal<TournamentStanding[]>([]);

    // Computed
    tournament = computed(() => this.tournamentStore.getTournamentById(this.tournamentId() || '') ?? null);
    tournamentMatches = computed(() => this.matchStore.getMatchesByTournament(this.tournamentId() || ''));

    liveBracket = computed(() => {
        const raw = this.bracket();
        if (!raw) return null;

        // Merge live match data from MatchStore to ensure real-time score updates in the bracket
        const updatedRounds = raw.rounds.map(round => ({
            ...round,
            matches: round.matches.map(match => this.matchStore.getMatchById(match.id) ?? match)
        }));

        return { ...raw, rounds: updatedRounds };
    });

    // Derived Computeds
    rulesList = computed(() => {
        const rules = this.tournament()?.rules;
        return rules ? rules.split('\n').filter(r => r.trim().length > 0) : [];
    });

    scorers = computed(() => {
        // Calculate scorers from matches locally for now, or fetch from backend if endpoint exists
        // Simplified: return empty or mock if backend doesn't provide it directly in tournament/matches
        // Real logic: iterate matches -> goals -> aggregate
        const matches = this.tournamentMatches();
        const scorerMap = new Map<string, { name: string, team: string, goals: number, teamId: string }>();

        matches.forEach(m => {
            m.goals?.forEach(g => {
                const key = g.playerId;
                if (!scorerMap.has(key)) {
                    scorerMap.set(key, {
                        name: g.playerName,
                        team: m.homeTeamId === g.teamId ? m.homeTeamName : m.awayTeamName,
                        goals: 0,
                        teamId: g.teamId
                    });
                }
                scorerMap.get(key)!.goals++;
            });
        });

        return Array.from(scorerMap.values())
            .sort((a, b) => b.goals - a.goals)
            .slice(0, 5); // Top 5
    });

    canGenerateMatches = computed(() => {
        const t = this.tournament();
        const regs = t?.registrations?.filter(r => r.status === RegistrationStatus.APPROVED) || [];
        // Basic check: Admin, Open/Closed (allow generation if closed or effectively full), enough teams
        // This logic mimics backend requirement often
        return this.isAdmin() &&
            (t?.status === TournamentStatus.REGISTRATION_OPEN || t?.status === TournamentStatus.REGISTRATION_CLOSED) &&
            regs.length >= 2;
    });

    // Registration Computeds
    myRegistration = computed(() => {
        const user = this.authService.getCurrentUser();
        const t = this.tournament();
        if (!user?.teamId || !t?.registrations) return null;
        return t.registrations.find(r => r.teamId === user.teamId) || null;
    });

    isRegistered = computed(() => !!this.myRegistration());

    isUserPending = computed(() => {
        return this.authService.getCurrentUser()?.status === UserStatus.PENDING;
    });

    groupedStandings = computed(() => {
        const all = this.standings();
        const activeG = this.activeGroup();
        if (activeG) {
            return all.filter(s => s.groupId === activeG);
        }
        return all;
    });

    // Table Columns Config
    tableColumns: TableColumn[] = [];

    // Tabs
    tabs = computed(() => {
        const t = this.tournament();
        const base = [
            { value: 'info', label: 'عن البطولة' },
            { value: 'standings', label: 'جدول الترتيب' },
        ];

        if (t?.format === TournamentFormat.GroupsThenKnockout ||
            t?.format === TournamentFormat.GroupsWithHomeAwayKnockout ||
            t?.format === TournamentFormat.KnockoutOnly) {
            // Insert bracket before matches
            base.push({ value: 'bracket', label: 'الأدوار الإقصائية' });
        }

        base.push({ value: 'matches', label: 'المباريات' });
        base.push({ value: 'teams', label: 'الفرق المشاركة' });

        return base;
    });

    ngOnInit(): void {
        this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            if (id) {
                this.tournamentId.set(id);
                this.loadInitialData(id);
            }
        });

        // Initialize table columns
        this.tableColumns = [
            { key: 'rank', label: '#', template: this.rankTemplate, width: '60px' },
            { key: 'teamName', label: 'الفريق', template: this.teamTemplate },
            { key: 'played', label: 'لعب', width: '60px', sortable: true },
            { key: 'won', label: 'فاز', width: '60px', sortable: true },
            { key: 'drawn', label: 'تعادل', width: '60px', sortable: true },
            { key: 'lost', label: 'خسر', width: '60px', sortable: true },
            { key: 'goalsFor', label: 'له', width: '60px' },
            { key: 'goalsAgainst', label: 'عليه', width: '60px' },
            { key: 'goalDifference', label: '+/-', width: '60px' },
            { key: 'points', label: 'نقاط', width: '80px', sortable: true },
            { key: 'form', label: 'الشكل', template: this.formTemplate, width: '120px' }
        ];
    }

    ngAfterViewInit(): void {
        // Implementation or empty
    }

    ngOnDestroy(): void {
        // Implementation or empty
    }

    isAdmin(): boolean {
        return this.authService.getCurrentUser()?.role === UserRole.ADMIN;
    }

    isCaptain(): boolean {
        // UserRole.CAPTAIN does not exist, check isTeamOwner flag
        const user = this.authService.getCurrentUser();
        return !!user?.isTeamOwner;
    }

    updateLayout(): void {
        // Adjust layout based on role if needed
        // This method was called in loadInitialData, likely to set specific layout flags
        if (this.isAdmin()) {
            // Admin layout adjustments
        }
    }

    // Load Initial Data (Updated logic)
    loadInitialData(id: string): void {
        this.isLoading.set(true);

        // 1. Load Tournament
        this.tournamentService.getTournamentById(id).subscribe({
            next: (data) => {
                if (data) {
                    this.tournamentStore.upsertTournament(data);
                    this.updateLayout();

                    // Check for Bracket/Groups tabs
                    if (data.format === TournamentFormat.GroupsThenKnockout || data.format === TournamentFormat.GroupsWithHomeAwayKnockout) {
                        this.tournamentService.getGroups(id).subscribe(g => {
                            this.groups.set(g);
                            if (g.length > 0 && !this.activeGroup()) this.activeGroup.set(g[0].id);
                        });
                    }

                    if (data.format === TournamentFormat.GroupsThenKnockout ||
                        data.format === TournamentFormat.GroupsWithHomeAwayKnockout ||
                        data.format === TournamentFormat.KnockoutOnly) {
                        this.tournamentService.getBracket(id).subscribe(b => this.bracket.set(b));
                    }
                }
                // ... (Load matches, standings same as before)
                this.matchService.getMatchesByTournament(id).subscribe({
                    next: (matches) => {
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

                this.tournamentService.getStandings(id).subscribe(standings => {
                    this.standings.set(standings);
                    const map = new Map<string, number>();
                    standings.forEach(s => {
                        if (s.groupId) map.set(s.teamId, s.groupId);
                    });
                    this.teamGroupMap.set(map);
                });
            },
            error: () => this.isLoading.set(false)
        });
    }

    onTabChange(tab: any): void {
        this.activeTab.set(tab);
    }

    onGroupChange(groupId: any): void {
        this.activeGroup.set(groupId);
    }

    generateMatches(): void {
        const t = this.tournament();
        if (!t) return;

        this.isGeneratingMatches.set(true);
        this.tournamentService.generateMatches(t.id).subscribe({
            next: (matches) => {
                this.isGeneratingMatches.set(false);
                this.uiFeedback.success('تم بنجاح', 'تم توليد جدول المباريات بنجاح.');
                // Refresh data to get new status and matches
                this.loadInitialData(t.id);
            },
            error: (err) => {
                this.isGeneratingMatches.set(false);
                this.uiFeedback.error('خطأ', err.error?.message || 'فشل توليد المباريات.');
            }
        });
    }

    navigateBack(): void {
        if (this.isAdmin()) {
            this.router.navigate(['/admin/tournaments']);
        } else if (this.isCaptain()) {
            this.router.navigate(['/captain/championships']);
        } else {
            this.router.navigate(['/']);
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
        const user = this.authService.getCurrentUser();
        if (!user?.teamId) return;

        const store = this.tournamentStore as unknown as { tournaments: () => { id: string, registrations: TeamRegistration[] }[] };
        // Check if tournaments signal actually exists, otherwise skip this logic or fetch if needed
        // Assuming tournamentStore tracks all loaded tournaments
        // If not accessible properly, we might default to false or rely on backend check

        // Fix for type safety if tournaments() not explicitly public? 
        // Assuming it's fine for now or I should check the store definition
        // Just keeping previous logic structure but handling potential missing method
        try {
            const allTournaments = store.tournaments();
            const t = this.tournament();

            if (allTournaments.length > 0 && t) {
                this.isBusyElsewhere = allTournaments.some((other) =>
                    other.id !== t.id &&
                    other.registrations?.some((r) => r.teamId === user.teamId && r.status !== RegistrationStatus.REJECTED)
                );
            }
        } catch (e) {
            console.warn('Could not check global busy status', e);
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
