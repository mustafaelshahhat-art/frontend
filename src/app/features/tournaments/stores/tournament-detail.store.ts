import { Injectable, signal, computed, inject, DestroyRef } from '@angular/core';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { TournamentService } from '../../../core/services/tournament.service';
import { MatchService } from '../../../core/services/match.service';
import { TournamentStore } from '../../../core/stores/tournament.store';
import { MatchStore } from '../../../core/stores/match.store';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import {
    Tournament, Match, TournamentStanding, Group, BracketDto,
    TournamentStatus, TournamentFormat, SchedulingMode
} from '../../../core/models/tournament.model';
import { UserRole, TeamRole } from '../../../core/models/user.model';
import { Permission } from '../../../core/permissions/permissions.model';
import { DetailTab, ModeCategory, classifyMode } from './tournament-detail.utils';

export type { DetailTab, ModeCategory } from './tournament-detail.utils';

/**
 * Per-detail-page signal store.  Provided at the **component** level
 * (not root) so each detail page gets its own isolated instance and is
 * garbage-collected when the route is destroyed.
 */
@Injectable()
export class TournamentDetailStore {
    // ── Injections ──
    private readonly tournamentService = inject(TournamentService);
    private readonly matchService = inject(MatchService);
    private readonly tournamentStore = inject(TournamentStore);
    private readonly matchStore = inject(MatchStore);
    private readonly authService = inject(AuthService);
    private readonly permissionsService = inject(PermissionsService);

    // ── Core state ──
    readonly tournamentId = signal<string | null>(null);
    readonly isLoading = signal(true);
    readonly activeTab = signal<DetailTab>('info');

    // ── UI signals (delegated from component) ──
    readonly isGeneratingMatches = signal(false);
    readonly isRegisterModalVisible = signal(false);
    readonly isOpeningMatchModalVisible = signal(false);

    // ── Data signals ──
    readonly standings = signal<TournamentStanding[]>([]);
    readonly groups = signal<Group[]>([]);
    readonly bracket = signal<BracketDto | null>(null);
    readonly activeGroup = signal<number | null>(null);
    readonly teamGroupMap = signal<Map<string, number>>(new Map());

    // ── Data-loaded flags (per tab, to avoid duplicate fetches) ──
    private readonly loadedTabs = signal<Set<DetailTab>>(new Set());

    // ── Computed: tournament from global store ──
    readonly tournament = computed(() =>
        this.tournamentStore.getTournamentById(this.tournamentId() ?? '') ?? null
    );

    // ── Mode category ──
    readonly modeCategory = computed<ModeCategory>(() => {
        const t = this.tournament();
        return classifyMode(t?.mode, t?.format);
    });

    readonly showStandings = computed(() => this.modeCategory() !== 'Knockout');
    readonly showBracket = computed(() => this.modeCategory() !== 'League');

    // ── Matches from global MatchStore ──
    readonly tournamentMatches = computed(() =>
        this.matchStore.getMatchesByTournament(this.tournamentId() ?? '')
    );

    // ── Live bracket (merges latest match data from MatchStore) ──
    readonly liveBracket = computed(() => {
        const raw = this.bracket();
        if (!raw) return null;
        const updatedRounds = raw.rounds.map(round => ({
            ...round,
            matches: round.matches.map(m => this.matchStore.getMatchById(m.id) ?? m)
        }));
        return { ...raw, rounds: updatedRounds };
    });

    // ── Grouped standings filtered by activeGroup ──
    readonly groupedStandings = computed(() => {
        const all = this.standings();
        const g = this.activeGroup();
        const groups = this.groups();
        // When groups exist, filter by activeGroup; otherwise return all (league mode)
        if (groups.length > 0 && g != null) {
            return all.filter(s => s.groupId === g);
        }
        return all;
    });

    // ── Available tabs based on mode + auth ──
    readonly tabs = computed(() => {
        const cat = this.modeCategory();
        const user = this.authService.getCurrentUser();

        const base: { value: DetailTab; label: string }[] = [
            { value: 'info', label: 'عن البطولة' },
        ];

        if (cat !== 'Knockout') {
            base.push({ value: 'standings', label: 'جدول الترتيب' });
        }
        if (cat !== 'League') {
            base.push({ value: 'bracket', label: 'الأدوار الإقصائية' });
        }

        if (user?.role !== UserRole.GUEST) {
            base.push({ value: 'matches', label: 'المباريات' });
            base.push({ value: 'teams', label: 'الفرق المشاركة' });
        }

        return base;
    });

    // ── Registration shortcuts ──
    readonly myRegistration = computed(() => {
        const user = this.authService.getCurrentUser();
        const t = this.tournament();
        if (!user?.teamId || !t?.registrations) return null;
        return t.registrations.find(r => r.teamId === user.teamId) ?? null;
    });

    readonly isRegistered = computed(() => !!this.myRegistration());

    readonly isCaptain = computed(() => {
        const user = this.authService.getCurrentUser();
        return !!(user?.teamId && user?.teamRole === TeamRole.CAPTAIN);
    });

    // ── Permission computeds ──
    readonly canEditTournament = computed(() => {
        const t = this.tournament();
        const matches = this.tournamentMatches();
        const isOwner = this.isOwner(t);
        return (this.permissionsService.has(Permission.MANAGE_TOURNAMENTS) || isOwner) &&
            (t?.status === TournamentStatus.DRAFT || t?.status === TournamentStatus.REGISTRATION_OPEN) &&
            matches.length === 0;
    });

    readonly canStartRegistration = computed(() => {
        const t = this.tournament();
        return (this.permissionsService.has(Permission.MANAGE_TOURNAMENTS) || this.isOwner(t)) &&
            t?.status === TournamentStatus.DRAFT;
    });

    readonly canCloseRegistration = computed(() => {
        const t = this.tournament();
        return (this.permissionsService.has(Permission.MANAGE_TOURNAMENTS) || this.isOwner(t)) &&
            t?.status === TournamentStatus.REGISTRATION_OPEN;
    });

    readonly canGenerateMatches = computed(() => {
        const t = this.tournament();
        const matches = this.tournamentMatches();
        return (this.permissionsService.has(Permission.MANAGE_TOURNAMENTS) || this.permissionsService.isOwner(t?.adminId || '')) &&
            t?.requiresAdminIntervention &&
            (t?.status === TournamentStatus.REGISTRATION_CLOSED || t?.status === TournamentStatus.ACTIVE) &&
            matches.length === 0 &&
            t?.schedulingMode === SchedulingMode.Manual;
    });

    readonly canStartTournament = computed(() => {
        const t = this.tournament();
        const matches = this.tournamentMatches();
        return (this.permissionsService.has(Permission.MANAGE_TOURNAMENTS) || this.isOwner(t)) &&
            t?.status === TournamentStatus.REGISTRATION_CLOSED &&
            matches.length > 0;
    });

    readonly canManageDraw = computed(() => {
        const t = this.tournament();
        return (this.permissionsService.has(Permission.MANAGE_TOURNAMENTS) || this.isOwner(t)) &&
            (t?.status === TournamentStatus.REGISTRATION_CLOSED ||
                t?.status === TournamentStatus.ACTIVE ||
                t?.status === TournamentStatus.QUALIFICATION_CONFIRMED);
    });

    readonly hasGroupMatches = computed(() =>
        this.tournamentMatches().some(m => m.groupId != null)
    );

    // ── Formats that contain a group stage ──
    private readonly isGroupsFormat = computed(() => {
        const f = this.tournament()?.format as string;
        return f === TournamentFormat.GroupsThenKnockout || f === 'GroupsWithHomeAwayKnockout';
    });

    // ── Manual mode + groups format + groups not drawn yet ──
    readonly canManageGroupDraw = computed(() => {
        const t = this.tournament();
        const hasPerms = this.permissionsService.has(Permission.MANAGE_TOURNAMENTS) || this.isOwner(t);
        return hasPerms &&
            this.isManualMode() &&
            this.isGroupsFormat() &&
            !this.hasGroupMatches() &&
            (t?.status === TournamentStatus.REGISTRATION_CLOSED ||
                t?.status === TournamentStatus.ACTIVE);
    });

    // ── Manual mode + knockout round not drawn yet ──
    readonly canManageKnockoutDraw = computed(() => {
        const t = this.tournament();
        const hasPerms = this.permissionsService.has(Permission.MANAGE_TOURNAMENTS) || this.isOwner(t);
        const isKnockoutFormat = !this.isGroupsFormat();
        const afterQualification = t?.status === TournamentStatus.QUALIFICATION_CONFIRMED;
        const awaitingFirstKnockout = isKnockoutFormat &&
            (t?.status === TournamentStatus.REGISTRATION_CLOSED || t?.status === TournamentStatus.ACTIVE);
        return hasPerms &&
            this.isManualMode() &&
            !this.hasKnockoutMatches() &&
            (afterQualification || awaitingFirstKnockout);
    });

    readonly hasKnockoutMatches = computed(() => {
        const knockoutStageNames = new Set(['Knockout', 'Final', 'Opening Match', 'Semi-final', 'Round 1']);
        return this.tournamentMatches().some(m =>
            knockoutStageNames.has(m.stageName ?? '') ||
            // Fallback: any match without a groupId is a knockout match
            (m.groupId == null && m.stageName !== 'League')
        );
    });

    readonly canResetSchedule = computed(() => {
        const t = this.tournament();
        const matches = this.tournamentMatches();
        const hasFinishedOrLive = matches.some(m => m.status === 'Finished' || m.status === 'Live');
        const validStatus = t?.status === TournamentStatus.REGISTRATION_CLOSED ||
            t?.status === TournamentStatus.ACTIVE ||
            t?.status === TournamentStatus.QUALIFICATION_CONFIRMED;
        return (this.permissionsService.has(Permission.MANAGE_TOURNAMENTS) || this.isOwner(t)) &&
            validStatus && matches.length > 0 && !hasFinishedOrLive;
    });

    readonly canSelectOpeningMatch = computed(() => {
        const t = this.tournament();
        const matches = this.tournamentMatches();
        return (this.permissionsService.has(Permission.MANAGE_TOURNAMENTS) || this.permissionsService.isOwner(t?.adminId || '')) &&
            (t?.status === TournamentStatus.REGISTRATION_CLOSED || t?.status === TournamentStatus.WAITING_FOR_OPENING_MATCH_SELECTION) &&
            matches.length === 0 &&
            (t?.schedulingMode === SchedulingMode.Random || (t?.schedulingMode as unknown) === 'Random');
    });

    readonly isManualMode = computed(() => {
        const t = this.tournament();
        return (t?.schedulingMode === SchedulingMode.Manual || (t?.schedulingMode as unknown) === 'Manual');
    });

    readonly canConfirmQualification = computed(() => {
        const t = this.tournament();
        return (this.permissionsService.has(Permission.MANAGE_TOURNAMENTS) || this.isOwner(t)) &&
            t?.status === TournamentStatus.MANUAL_QUALIFICATION_PENDING;
    });

    readonly canGenerateKnockoutR1 = computed(() => {
        const t = this.tournament();
        return (this.permissionsService.has(Permission.MANAGE_TOURNAMENTS) || this.isOwner(t)) &&
            t?.status === TournamentStatus.QUALIFICATION_CONFIRMED &&
            !this.isManualMode();
    });

    // ─── Actions ────────────────────────────────────

    /** Set the active tab. Lazily triggers data load for the tab if not already cached. */
    setTab(tab: DetailTab, destroyRef: DestroyRef): void {
        this.activeTab.set(tab);
        this.ensureTabDataLoaded(tab, destroyRef);
    }

    /** Called once when the route resolves the tournament id. */
    async loadTournament(id: string, destroyRef: DestroyRef): Promise<void> {
        this.tournamentId.set(id);
        this.isLoading.set(true);

        try {
            const data = await firstValueFrom(this.tournamentService.getTournamentById(id));
            if (!data) {
                this.isLoading.set(false);
                return;
            }
            this.tournamentStore.upsertTournament(data);

            // Determine which parallel calls to fire based on mode
            const cat = classifyMode(data.mode, data.format);
            const needsStandings = cat !== 'Knockout';
            const needsBracket = cat !== 'League';
            const hasGroups = cat === 'GroupsThenKnockout';

            const result = await firstValueFrom(forkJoin({
                matches: this.matchService.getMatchesByTournament(id).pipe(catchError(() => of([]))),
                standings: needsStandings
                    ? this.tournamentService.getStandings(id).pipe(catchError(() => of([])))
                    : of([]),
                groups: hasGroups
                    ? this.tournamentService.getGroups(id).pipe(catchError(() => of([])))
                    : of([]),
                bracket: needsBracket
                    ? this.tournamentService.getBracket(id).pipe(catchError(() => of(null)))
                    : of(null),
            }));

            // Matches → MatchStore
            (result.matches as Match[]).forEach(m => {
                if (!this.matchStore.getMatchById(m.id)) {
                    this.matchStore.addMatch(m);
                } else {
                    this.matchStore.updateMatch(m);
                }
            });

            // Standings
            const standingsArr = result.standings as TournamentStanding[];
            this.standings.set(standingsArr);
            const map = new Map<string, number>();
            standingsArr.forEach(s => { if (s.groupId) map.set(s.teamId, s.groupId); });
            this.teamGroupMap.set(map);

            // Groups — always auto-select first group when available
            const groupsArr = result.groups as Group[];
            this.groups.set(groupsArr);
            if (groupsArr.length > 0) {
                this.activeGroup.set(groupsArr[0].id);
            }

            // Bracket
            if (result.bracket) {
                this.bracket.set(result.bracket as BracketDto);
            }

            // Mark loaded tabs
            const loaded = new Set<DetailTab>(['info', 'matches', 'teams']);
            if ((result.standings as TournamentStanding[]).length || this.showStandings()) loaded.add('standings');
            if (result.bracket || this.showBracket()) loaded.add('bracket');
            this.loadedTabs.set(loaded);

            this.isLoading.set(false);
        } catch {
            this.isLoading.set(false);
        }
    }

    /** Full reload (after admin mutation). */
    reload(destroyRef: DestroyRef): void {
        const id = this.tournamentId();
        if (!id) return;
        this.loadedTabs.set(new Set());
        this.tournamentService.invalidateCache(`detail:${id}`);
        this.tournamentService.invalidateCache(`standings:${id}`);
        this.tournamentService.invalidateCache(`bracket:${id}`);
        this.tournamentService.invalidateCache(`groups:${id}`);
        this.loadTournament(id, destroyRef);
    }

    // ── Private helpers ──

    private isOwner(t: Tournament | null): boolean {
        if (!t) return false;
        return this.permissionsService.isOwner(t.adminId || '') ||
            this.permissionsService.isOwner(t.creatorUserId || '');
    }

    /**
     * Lazily load data for a tab if it hasn't been loaded yet.
     * `info`, `matches`, `teams` are always loaded with the initial call.
     * `standings` and `bracket` are also loaded initially but this guard
     * future-proofs for cases where the initial call skipped them.
     */
    private async ensureTabDataLoaded(tab: DetailTab, destroyRef: DestroyRef): Promise<void> {
        if (this.loadedTabs().has(tab)) return;
        const id = this.tournamentId();
        if (!id) return;

        if (tab === 'standings' && !this.loadedTabs().has('standings')) {
            const cat = this.modeCategory();
            const needsGroups = cat === 'GroupsThenKnockout' && this.groups().length === 0;

            try {
                const { standings, groups } = await firstValueFrom(forkJoin({
                    standings: this.tournamentService.getStandings(id).pipe(catchError(() => of([]))),
                    groups: needsGroups
                        ? this.tournamentService.getGroups(id).pipe(catchError(() => of([])))
                        : of(this.groups()),
                }));
                this.standings.set(standings);
                if (groups.length > 0) {
                    this.groups.set(groups);
                    if (this.activeGroup() == null) {
                        this.activeGroup.set(groups[0].id);
                    }
                }
                this.markTabLoaded('standings');
            } catch {
                // silently ignore
            }
        }

        if (tab === 'bracket' && !this.loadedTabs().has('bracket')) {
            try {
                const data = await firstValueFrom(
                    this.tournamentService.getBracket(id).pipe(catchError(() => of(null)))
                );
                if (data) this.bracket.set(data);
                this.markTabLoaded('bracket');
            } catch {
                // silently ignore
            }
        }
    }

    private markTabLoaded(tab: DetailTab): void {
        this.loadedTabs.update(s => {
            const next = new Set(s);
            next.add(tab);
            return next;
        });
    }
}
