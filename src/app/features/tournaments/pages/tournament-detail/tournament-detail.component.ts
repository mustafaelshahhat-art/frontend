import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, TemplateRef, AfterViewInit, signal, computed, ChangeDetectionStrategy, OnDestroy, HostBinding, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ContextNavigationService } from '../../../../core/navigation/context-navigation.service';
import { FormsModule } from '@angular/forms';
import { TournamentService } from '../../../../core/services/tournament.service';
import { MatchService } from '../../../../core/services/match.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TournamentStatus, Match, MatchStatus, RegistrationStatus, TeamRegistration, Group, BracketDto, TournamentFormat, BracketRound, TournamentStanding, MatchEventType } from '../../../../core/models/tournament.model';
import { UserRole, UserStatus, TeamRole } from '../../../../core/models/user.model';
import { TournamentStore } from '../../../../core/stores/tournament.store';
import { MatchStore } from '../../../../core/stores/match.store';
import { Permission } from '../../../../core/permissions/permissions.model';
import { PermissionsService } from '../../../../core/services/permissions.service';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { FilterComponent } from '../../../../shared/components/filter/filter.component';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { MatchCardComponent } from '../../../../shared/components/match-card/match-card.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { SmartImageComponent } from '../../../../shared/components/smart-image/smart-image.component';
import { TeamRegistrationModalComponent } from '../../components/team-registration-modal/team-registration-modal.component';
import { KnockoutBracketComponent } from '../../components/knockout-bracket/knockout-bracket.component';
import { TableComponent, TableColumn } from '../../../../shared/components/table/table.component';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { LayoutOrchestratorService } from '../../../../core/services/layout-orchestrator.service';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';

@Component({
    selector: 'app-tournament-detail',
    standalone: true,
    imports: [IconComponent,
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
        TableComponent,
        KnockoutBracketComponent,
        HasPermissionDirective
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
    private permissionsService = inject(PermissionsService);
    private uiFeedback = inject(UIFeedbackService);
    private cdr = inject(ChangeDetectorRef);
    private tournamentStore: TournamentStore = inject(TournamentStore);
    private matchStore: MatchStore = inject(MatchStore);
    private layoutOrchestrator = inject(LayoutOrchestratorService);
    private navService = inject(ContextNavigationService);
    private destroyRef = inject(DestroyRef);

    Permission = Permission;
    private sanitizer = inject(DomSanitizer);

    // Expose Enums to template
    TournamentStatus = TournamentStatus;
    MatchStatus = MatchStatus;
    RegistrationStatus = RegistrationStatus;
    MatchEventType = MatchEventType;

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
        const matches = this.tournamentMatches();
        const scorerMap = new Map<string, { name: string, team: string, goals: number, teamId: string }>();

        matches.forEach(m => {
            // Process goals from both sources to ensure we capture all data
            const goalsSource = [...(m.goals || [])];

            // Add goals from events if they're not already in goals (backend often sends events)
            if (m.events) {
                m.events
                    .filter(e => (e.type as any) === 'Goal' || e.type === MatchEventType.GOAL)
                    .forEach(e => {
                        if (e.playerId && !goalsSource.some(g => g.playerId === e.playerId && g.minute === e.minute)) {
                            goalsSource.push({
                                playerId: e.playerId,
                                playerName: e.playerName || 'لاعب مجهول',
                                teamId: e.teamId,
                                minute: e.minute
                            });
                        }
                    });
            }

            goalsSource.forEach(g => {
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
            .slice(0, 10); // Show top 10 instead of 5
    });

    canGenerateMatches = computed(() => {
        const t = this.tournament();
        const matches = this.tournamentMatches();
        return (this.permissionsService.has(Permission.MANAGE_TOURNAMENTS) || this.permissionsService.isOwner(t?.adminId || '')) &&
            t?.requiresAdminIntervention &&
            (t?.status === TournamentStatus.REGISTRATION_CLOSED || t?.status === TournamentStatus.ACTIVE) &&
            matches.length === 0;
    });

    canEditTournament = computed(() => {
        const t = this.tournament();
        const matches = this.tournamentMatches();
        const isOwner = this.permissionsService.isOwner(t?.adminId || '') || this.permissionsService.isOwner(t?.creatorUserId || '');
        return (this.permissionsService.has(Permission.MANAGE_TOURNAMENTS) || isOwner) &&
            (t?.status === TournamentStatus.DRAFT || t?.status === TournamentStatus.REGISTRATION_OPEN) &&
            matches.length === 0;
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

    isCaptain = computed(() => {
        const user = this.authService.getCurrentUser();
        return user?.teamId && user?.teamRole === TeamRole.CAPTAIN;
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
        this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
            const id = params.get('id');
            if (id) {
                this.tournamentId.set(id);
                this.updateLayout(); // Initial call with placeholders
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
        this.layoutOrchestrator.reset();
    }

    updateLayout(): void {
        const tournament = this.tournament();
        const title = tournament ? tournament.name : 'تحميل...';

        this.layoutOrchestrator.setTitle('تفاصيل البطولة');
        this.layoutOrchestrator.setSubtitle(title);
        this.layoutOrchestrator.setBackAction(() => this.navigateBack());
    }

    // Load Initial Data (Updated logic)
    loadInitialData(id: string): void {
        this.isLoading.set(true);

        // 1. Load Tournament
        this.tournamentService.getTournamentById(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (data) => {
                if (data) {
                    this.tournamentStore.upsertTournament(data);
                    this.updateLayout();

                    // Check for Bracket/Groups tabs
                    if (data.format === TournamentFormat.GroupsThenKnockout || data.format === TournamentFormat.GroupsWithHomeAwayKnockout) {
                        this.tournamentService.getGroups(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(g => {
                            this.groups.set(g);
                            if (g.length > 0 && !this.activeGroup()) this.activeGroup.set(g[0].id);
                        });
                    }

                    if (data.format === TournamentFormat.GroupsThenKnockout ||
                        data.format === TournamentFormat.GroupsWithHomeAwayKnockout ||
                        data.format === TournamentFormat.KnockoutOnly) {
                        this.tournamentService.getBracket(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(b => this.bracket.set(b));
                    }
                }
                // ... (Load matches, standings same as before)
                this.matchService.getMatchesByTournament(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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

                this.tournamentService.getStandings(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(standings => {
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
        this.tournamentService.generateMatches(t.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
        const prefix = this.navService.getRootPrefix();
        if (prefix === '/admin') {
            this.navService.navigateTo('tournaments');
        } else if (prefix === '/creator') {
            this.navService.navigateTo('tournaments');
        } else {
            this.router.navigate(['/player/tournaments']);
        }
    }

    getBackRoute(): string {
        const prefix = this.navService.getRootPrefix();
        if (prefix === '/admin') return `${prefix}/tournaments`;
        if (prefix === '/creator') return `${prefix}/tournaments`;
        return '/player/tournaments';
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

    isRegisterModalVisible = false;

    openRegisterModal(): void {
        this.isRegisterModalVisible = true;
    }

    closeRegisterModal(): void {
        this.isRegisterModalVisible = false;
    }

    onRegistrationSuccess(): void {
        this.closeRegisterModal();
    }

    editTournament(): void {
        const t = this.tournament();
        if (t) {
            this.navService.navigateTo(['tournaments', 'edit', t.id]);
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
        ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.isLoading.set(true);
                this.tournamentService.deleteTournament(t.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
                    next: () => {
                        this.uiFeedback.success('تم الحذف', 'تم حذف البطولة بنجاح');
                        this.navService.navigateTo('tournaments');
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
            this.tournamentService.closeRegistration(t.id).subscribe({
                next: (updatedTournament) => {
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
            const newStatus = TournamentStatus.REGISTRATION_OPEN;
            this.tournamentService.updateTournament(t.id, { status: newStatus }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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

    registerTeam(): void {
        const t = this.tournament();
        if (t) {
            this.openRegisterModal();
        }
    }

    checkGlobalBusyStatus(): void {
        const user = this.authService.getCurrentUser();
        if (!user?.teamId) return;

        const store = this.tournamentStore as any;
        try {
            const allTournaments = store.tournaments();
            const t = this.tournament();

            if (allTournaments.length > 0 && t) {
                this.isBusyElsewhere = allTournaments.some((other: any) =>
                    other.id !== t.id &&
                    other.registrations?.some((r: any) => r.teamId === user.teamId && r.status !== RegistrationStatus.REJECTED)
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
        ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.isLoading.set(true);
                this.tournamentService.eliminateTeam(t.id, teamId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
                    next: (updatedTournament) => {
                        if (updatedTournament) {
                            this.tournamentStore.upsertTournament(updatedTournament);
                        } else {
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

    viewMatch(matchId: string): void {
        this.navService.navigateTo(['matches', matchId]);
    }

    openChat(matchId: string): void {
        this.navService.navigateTo(['matches', matchId, 'chat']);
    }

    updateScore(match: Match): void {
        this.navService.navigateTo(['matches', match.id]);
    }



    emergencyStart(): void {
        const t = this.tournament();
        if (!t) return;

        this.uiFeedback.confirm(
            '⚠️ إجراء طارئ: بدء البطولة',
            `هذا الإجراء مخصص فقط للحالات التي يتعطل فيها البدء التلقائي. هل أنت متأكد من رغبتك في فرض بدء بطولة "${t.name}"؟`,
            'تأكيد البدء الطارئ',
            'danger'
        ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(confirmed => {
            if (confirmed) {
                this.isLoading.set(true);
                this.tournamentService.emergencyStart(t.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
                    next: (updatedTournament) => {
                        this.tournamentStore.upsertTournament(updatedTournament);
                        this.uiFeedback.success('تم التدخل بنجاح', 'تم تغيير حالة البطولة إلى نشطة');
                        this.isLoading.set(false);
                        this.cdr.detectChanges();
                    },
                    error: (err) => {
                        this.isLoading.set(false);
                        this.uiFeedback.error('خطأ', err.error?.message || 'فشل البدء الطارئ');
                        this.cdr.detectChanges();
                    }
                });
            }
        });
    }

    emergencyEnd(): void {
        const t = this.tournament();
        if (!t) return;

        this.uiFeedback.confirm(
            '⚠️ إجراء طارئ: إنهاء البطولة',
            `هذا الإجراء مخصص فقط للحالات التي تتعلق بمشاكل في النظام. هل أنت متأكد من فرض إنهاء بطولة "${t.name}"؟ سيتم نقلها للأرشيف.`,
            'تأكيد الإنهاء الطارئ',
            'danger'
        ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(confirmed => {
            if (confirmed) {
                this.isLoading.set(true);
                this.tournamentService.emergencyEnd(t.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
                    next: (updatedTournament) => {
                        this.tournamentStore.upsertTournament(updatedTournament);
                        this.uiFeedback.success('تم التدخل بنجاح', 'تم إنهاء البطولة بنجاح');
                        this.isLoading.set(false);
                        this.cdr.detectChanges();
                    },
                    error: (err) => {
                        this.isLoading.set(false);
                        this.uiFeedback.error('خطأ', err.error?.message || 'فشل الإنهاء الطارئ');
                        this.cdr.detectChanges();
                    }
                });
            }
        });
    }
}
