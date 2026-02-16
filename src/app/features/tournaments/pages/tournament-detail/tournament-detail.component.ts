import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, TemplateRef, AfterViewInit, signal, computed, ChangeDetectionStrategy, OnDestroy, HostBinding, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ContextNavigationService } from '../../../../core/navigation/context-navigation.service';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { TournamentService } from '../../../../core/services/tournament.service';
import { MatchService } from '../../../../core/services/match.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TournamentStatus, Match, MatchStatus, RegistrationStatus, TeamRegistration, Group, BracketDto, TournamentFormat, BracketRound, TournamentStanding, MatchEventType, SchedulingMode } from '../../../../core/models/tournament.model';
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
import { OpeningMatchModalComponent } from '../../components/opening-match-modal/opening-match-modal.component';
import { KnockoutBracketComponent } from '../../components/knockout-bracket/knockout-bracket.component';
import { TableComponent, TableColumn } from '../../../../shared/components/table/table.component';
// PERF-FIX F4: Extracted tournament status helpers into reusable utils
import { getTournamentStatusLabel, getRegStatusLabel as _regStatusLabel, getRegStatusType as _regStatusType } from '../../utils/tournament-status.utils';
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
        OpeningMatchModalComponent,
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
    SchedulingMode = SchedulingMode;

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
            matches.length === 0 &&
            t?.schedulingMode === SchedulingMode.Manual; // Only show for Manual mode, not Random
    });

    canEditTournament = computed(() => {
        const t = this.tournament();
        const matches = this.tournamentMatches();
        const isOwner = this.permissionsService.isOwner(t?.adminId || '') || this.permissionsService.isOwner(t?.creatorUserId || '');
        return (this.permissionsService.has(Permission.MANAGE_TOURNAMENTS) || isOwner) &&
            (t?.status === TournamentStatus.DRAFT || t?.status === TournamentStatus.REGISTRATION_OPEN) &&
            matches.length === 0;
    });

    canStartRegistration = computed(() => {
        const t = this.tournament();
        const isOwner = this.permissionsService.isOwner(t?.adminId || '') || this.permissionsService.isOwner(t?.creatorUserId || '');
        return (this.permissionsService.has(Permission.MANAGE_TOURNAMENTS) || isOwner) &&
            t?.status === TournamentStatus.DRAFT;
    });

    canGenerateKnockout = computed(() => {
        const t = this.tournament();
        const matches = this.tournamentMatches();
        return (this.permissionsService.has(Permission.MANAGE_TOURNAMENTS) || this.permissionsService.isOwner(t?.adminId || '')) &&
            t?.status === TournamentStatus.WAITING_FOR_OPENING_MATCH_SELECTION &&
            matches.some(m => !m.groupId); // Some knockout matches might already exist if we clicked generate once.
    });

    canManageDraw = computed(() => {
        const t = this.tournament();
        const isOwner = this.permissionsService.isOwner(t?.adminId || '') || this.permissionsService.isOwner(t?.creatorUserId || '');
        return (this.permissionsService.has(Permission.MANAGE_TOURNAMENTS) || isOwner) &&
            (t?.status === TournamentStatus.REGISTRATION_CLOSED || t?.status === TournamentStatus.ACTIVE);
    });

    canCloseRegistration = computed(() => {
        const t = this.tournament();
        const isOwner = this.permissionsService.isOwner(t?.adminId || '') || this.permissionsService.isOwner(t?.creatorUserId || '');
        return (this.permissionsService.has(Permission.MANAGE_TOURNAMENTS) || isOwner) &&
            t?.status === TournamentStatus.REGISTRATION_OPEN;
    });

    canGenerateSchedule = computed(() => {
        return false; // Replaced by automated flow via setOpeningMatch
    });

    canStartTournament = computed(() => {
        const t = this.tournament();
        const matches = this.tournamentMatches();
        const isOwner = this.permissionsService.isOwner(t?.adminId || '') || this.permissionsService.isOwner(t?.creatorUserId || '');

        // Show Start Tournament if:
        // 1. User has permission
        // 2. Tournament is in RegistrationClosed status
        // 3. Matches exist
        return (this.permissionsService.has(Permission.MANAGE_TOURNAMENTS) || isOwner) &&
            t?.status === TournamentStatus.REGISTRATION_CLOSED &&
            matches.length > 0;
    });

    canResetSchedule = computed(() => {
        const t = this.tournament();
        const matches = this.tournamentMatches();
        const isOwner = this.permissionsService.isOwner(t?.adminId || '') || this.permissionsService.isOwner(t?.creatorUserId || '');

        // Allowed if tournament hasn't started matches yet (all scheduled) or specifically Closed
        return (this.permissionsService.has(Permission.MANAGE_TOURNAMENTS) || isOwner) &&
            (t?.status === TournamentStatus.REGISTRATION_CLOSED || t?.status === TournamentStatus.ACTIVE) &&
            matches.length > 0 &&
            !matches.some(m => m.status === MatchStatus.FINISHED || m.status === MatchStatus.LIVE);
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

        const user = this.authService.getCurrentUser();
        if (user?.role !== UserRole.GUEST) {
            base.push({ value: 'matches', label: 'المباريات' });
            base.push({ value: 'teams', label: 'الفرق المشاركة' });
        }

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

    // PERF-FIX F2: forkJoin replaces waterfall API calls — all requests fire in parallel
    loadInitialData(id: string): void {
        this.isLoading.set(true);

        // 1. Load Tournament first (needed to determine which parallel calls to make)
        this.tournamentService.getTournamentById(id).pipe(
            takeUntilDestroyed(this.destroyRef),
            switchMap((data) => {
                if (!data) {
                    this.isLoading.set(false);
                    return of(null);
                }
                this.tournamentStore.upsertTournament(data);
                this.updateLayout();

                // 2. Build parallel calls based on tournament format
                const hasGroups = data.format === TournamentFormat.GroupsThenKnockout || 
                                  data.format === TournamentFormat.GroupsWithHomeAwayKnockout;
                const hasKnockout = hasGroups || data.format === TournamentFormat.KnockoutOnly;

                return forkJoin({
                    matches: this.matchService.getMatchesByTournament(id).pipe(catchError(() => of([]))),
                    standings: this.tournamentService.getStandings(id).pipe(catchError(() => of([]))),
                    groups: hasGroups 
                        ? this.tournamentService.getGroups(id).pipe(catchError(() => of([])))
                        : of([]),
                    bracket: hasKnockout 
                        ? this.tournamentService.getBracket(id).pipe(catchError(() => of(null)))
                        : of(null)
                });
            })
        ).subscribe({
            next: (result) => {
                if (!result) return;

                // Process matches
                result.matches.forEach((m: Match) => {
                    if (!this.matchStore.getMatchById(m.id)) {
                        this.matchStore.addMatch(m);
                    } else {
                        this.matchStore.updateMatch(m);
                    }
                });

                // Process standings
                this.standings.set(result.standings as TournamentStanding[]);
                const map = new Map<string, number>();
                (result.standings as TournamentStanding[]).forEach(s => {
                    if (s.groupId) map.set(s.teamId, s.groupId);
                });
                this.teamGroupMap.set(map);

                // Process groups
                if (result.groups && (result.groups as Group[]).length > 0) {
                    this.groups.set(result.groups as Group[]);
                    if (!this.activeGroup()) this.activeGroup.set((result.groups as Group[])[0].id);
                }

                // Process bracket
                if (result.bracket) {
                    this.bracket.set(result.bracket as BracketDto);
                }

                this.isLoading.set(false);
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
        // If guest, ensure we stay in guest context
        if (prefix === '/guest') {
            this.router.navigate(['/guest/tournaments']);
            return;
        }

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
        if (prefix === '/guest') return '/guest/tournaments';
        if (prefix === '/admin') return `${prefix}/tournaments`;
        if (prefix === '/creator') return `${prefix}/tournaments`;
        return '/player/tournaments';
    }

    // PERF-FIX F4: Delegate to extracted utility functions
    getStatusLabel(status: TournamentStatus | undefined): string {
        return getTournamentStatusLabel(status);
    }

    getRegStatusLabel(status: string): string {
        return _regStatusLabel(status);
    }

    getRegStatusType(status: string): 'primary' | 'gold' | 'danger' | 'info' | 'warning' | 'success' | 'muted' | 'neutral' | 'live' {
        return _regStatusType(status);
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

        if (t.status === TournamentStatus.DRAFT) {
            // PROD-FIX: Transition from Draft to RegistrationOpen
            this.tournamentService.updateTournament(t.id, { status: TournamentStatus.REGISTRATION_OPEN }).subscribe({
                next: (updatedTournament) => {
                    this.tournamentStore.updateTournament(updatedTournament);
                    this.isLoading.set(false);
                    this.uiFeedback.success('تم التحديث', 'تم فتح باب التسجيل بنجاح');
                    this.cdr.detectChanges();
                },
                error: (err: any) => {
                    this.isLoading.set(false);
                    const msg = err.error?.message || 'خطأ غير معروف';
                    this.uiFeedback.error('خطأ', 'فشل فتح التسجيل: ' + msg);
                    this.cdr.detectChanges();
                }
            });
        } else if (t.status === TournamentStatus.REGISTRATION_OPEN) {
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

    startTournament(): void {
        const t = this.tournament();
        if (!t) return;

        this.uiFeedback.confirm(
            'بدء锦标赛',
            `هل أنت متأكد من بدء "${t.name}"؟ بمجرد البدء، لن تتمكن من تعديل الجدول.`,
            'تأكيد البدء',
            'info'
        ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.isLoading.set(true);
                this.tournamentService.startTournament(t.id).subscribe({
                    next: (updatedTournament) => {
                        this.tournamentStore.updateTournament(updatedTournament);
                        this.isLoading.set(false);
                        this.uiFeedback.success('تم بنجاح', 'تم بدء锦标赛 بنجاح');
                        this.cdr.detectChanges();
                        // Refresh matches
                        this.loadInitialData(t.id);
                    },
                    error: (err) => {
                        this.isLoading.set(false);
                        this.uiFeedback.error('خطأ', err.error?.message || 'فشل بدء');
                        this.cdr.detectChanges();
                    }
                });
            }
        });
    }

    registerTeam(): void {
        const t = this.tournament();
        if (t) {
            this.openRegisterModal();
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
                    next: () => {
                        this.loadInitialData(t.id);
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

    isOpeningMatchModalVisible = false;

    canSelectOpeningMatch = computed(() => {
        const t = this.tournament();
        const matches = this.tournamentMatches();
        const isOwner = this.permissionsService.isOwner(t?.adminId || '') || this.permissionsService.isOwner(t?.creatorUserId || '');

        return (this.permissionsService.has(Permission.MANAGE_TOURNAMENTS) || isOwner) &&
            (t?.status === TournamentStatus.REGISTRATION_CLOSED || t?.status === TournamentStatus.WAITING_FOR_OPENING_MATCH_SELECTION) &&
            matches.length === 0 &&
            ((t?.schedulingMode as any) === 'Random' || (t?.schedulingMode as any) === 0); // Only show for Random mode
    });

    isManualMode = computed(() => {
        const t = this.tournament();
        return (t?.schedulingMode as any) === 'Manual' || (t?.schedulingMode as any) === 1;
    });

    openOpeningMatchModal(): void {
        this.isOpeningMatchModalVisible = true;
    }

    closeOpeningMatchModal(): void {
        this.isOpeningMatchModalVisible = false;
    }

    onOpeningMatchSelected(event: { homeTeamId: string, awayTeamId: string }): void {
        const t = this.tournament();
        if (!t) return;

        this.isLoading.set(true);
        this.tournamentService.setOpeningMatch(t.id, event.homeTeamId, event.awayTeamId).subscribe({
            next: (matches) => {
                this.isOpeningMatchModalVisible = false;

                // Add generated matches to the store if any were returned (Random mode)
                if (matches && matches.length > 0) {
                    matches.forEach((match: Match) => {
                        if (!this.matchStore.getMatchById(match.id)) {
                            this.matchStore.addMatch(match);
                        } else {
                            this.matchStore.updateMatch(match);
                        }
                    });

                    // Show success message with match count
                    this.uiFeedback.success('تم بنجاح', `تم تحديد مباراة الافتتاح وتوليد ${matches.length} مباراة بنجاح.`);
                } else {
                    this.uiFeedback.success('تم بنجاح', 'تم تحديد مباراة الافتتاح بنجاح.');
                }

                // Wait a moment before reloading to ensure backend has processed everything
                setTimeout(() => {
                    this.loadInitialData(t.id);
                    this.isLoading.set(false);
                    this.cdr.detectChanges();
                }, 1000);
            },
            error: (err) => {
                this.isOpeningMatchModalVisible = false;
                this.isLoading.set(false);
                this.uiFeedback.error('خطأ', err.error?.message || 'فشل تحديد مباراة الافتتاح');
                this.cdr.detectChanges();
            }
        });
    }

    // Renaming original selectOpeningMatch if it's referenced in template, or just overwriting behavior
    selectOpeningMatch(): void {
        const t = this.tournament();
        const matches = this.tournamentMatches();

        // Validation: Must be RegistrationClosed and NO matches
        if (!t || matches.length > 0) {
            this.uiFeedback.warning('تنبيه', 'لا يمكن تعديل مباراة الافتتاح بعد توليد الجدول.');
            return;
        }

        this.openOpeningMatchModal();
    }

    startManualDraw(): void {
        const t = this.tournament();
        if (!t) return;

        this.navService.navigateTo(['tournaments', t.id, 'manual-draw']);
    }

    approveRegistration(reg: TeamRegistration): void {
        const t = this.tournament();
        if (!t) return;

        this.tournamentService.approveRegistration(t.id, reg.teamId).subscribe({
            next: (updatedReg) => {
                this.uiFeedback.success('تم التأكيد', `تم تأكيد تسجيل فريق ${reg.teamName} بنجاح`);
                this.loadInitialData(t.id);
            },
            error: (err) => this.uiFeedback.error('خطأ', err.error?.message || 'فشل تأكيد التسجيل')
        });
    }

    resetSchedule(): void {
        const t = this.tournament();
        if (!t) return;

        this.uiFeedback.confirm(
            'حذف الجدولة وتصفير القرعة',
            'هل أنت متأكد من حذف جميع المباريات والقرعة الحالية؟ سيتم إعادة البطولة لحالة ما قبل التوزيع لتتمكن من تغيير نظام الجدولة أو التوزيع مرة أخرى.',
            'حذف الجدولة',
            'danger'
        ).subscribe(confirmed => {
            if (confirmed) {
                this.isLoading.set(true);
                this.tournamentService.resetSchedule(t.id).subscribe({
                    next: () => {
                        this.uiFeedback.success('تم الحذف', 'تم حذف الجدول بنجاح. يمكنك الآن إعادة الجدولة.');
                        // Clear match store for this tournament
                        this.matchStore.clearTournamentMatches(t.id);
                        this.loadInitialData(t.id);
                    },
                    error: (err) => {
                        this.isLoading.set(false);
                        this.uiFeedback.error('خطأ', err.error?.message || 'فشل حذف الجدول');
                    }
                });
            }
        });
    }

    rejectRegistration(reg: TeamRegistration): void {
        const t = this.tournament();
        if (!t) return;

        const reason = window.prompt('يرجى إدخال سبب الرفض:');
        if (reason) {
            this.tournamentService.rejectRegistration(t.id, reg.teamId, reason).subscribe({
                next: () => {
                    this.uiFeedback.success('تم الرفض', `تم رفض تسجيل فريق ${reg.teamName}`);
                    this.loadInitialData(t.id);
                },
                error: (err) => this.uiFeedback.error('خطأ', err.error?.message || 'فشل رفض التسجيل')
            });
        }
    }

    promoteTeam(reg: TeamRegistration): void {
        const t = this.tournament();
        if (!t) return;

        this.tournamentService.promoteWaitingTeam(t.id, reg.teamId).subscribe({
            next: () => {
                this.uiFeedback.success('تم الترقية', `تم نقل فريق ${reg.teamName} من قائمة الانتظار للمشاركة`);
                this.loadInitialData(t.id);
            },
            error: (err) => this.uiFeedback.error('خطأ', err.error?.message || 'فشل ترقية الفريق')
        });
    }

    withdrawTeam(reg: TeamRegistration): void {
        const t = this.tournament();
        if (!t) return;

        this.uiFeedback.confirm('انسحاب من البطولة', `هل أنت متأكد من رغبتك في الانسحاب من بطولة ${t.name}؟`, 'تأكيد الانسحاب', 'danger').subscribe(confirmed => {
            if (confirmed) {
                this.tournamentService.withdrawTeam(t.id, reg.teamId).subscribe({
                    next: () => {
                        this.uiFeedback.success('تم الانسحاب', 'تم سحب فريقك من البطولة بنجاح');
                        this.loadInitialData(t.id);
                    },
                    error: (err) => this.uiFeedback.error('خطأ', err.error?.message || 'فشل الانسحاب')
                });
            }
        });
    }
}
