import { Injectable, signal, computed, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, switchMap, tap, distinctUntilChanged, filter } from 'rxjs/operators';

import { TournamentService } from '../../../core/services/tournament.service';
import { MatchService } from '../../../core/services/match.service';
import { TournamentStore } from '../../../core/stores/tournament.store';
import { MatchStore } from '../../../core/stores/match.store';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import {
    Tournament, Match, TournamentStanding, Group, BracketDto,
    TournamentFormat, TournamentMode, TournamentStatus, BracketRound,
    RegistrationStatus, SchedulingMode, TeamRegistration
} from '../../../core/models/tournament.model';
import { UserRole, TeamRole } from '../../../core/models/user.model';
import { Permission } from '../../../core/permissions/permissions.model';

/** Which top-level tab the user is on */
export type DetailTab = 'info' | 'standings' | 'bracket' | 'matches' | 'teams';

/**
 * Categorise a TournamentMode (int enum 1-6) into one of three rendering
 * strategies used for conditional tab visibility and data loading.
 *
 *   League            → standings only
 *   Knockout          → bracket only
 *   GroupsThenKnockout → both
 */
export type ModeCategory = 'League' | 'Knockout' | 'GroupsThenKnockout';

function classifyMode(mode?: TournamentMode, format?: string): ModeCategory {
    // Prefer the numeric mode enum coming from the DTO
    if (mode != null) {
        switch (mode) {
            case TournamentMode.LeagueSingle:
            case TournamentMode.LeagueHomeAway:
                return 'League';
            case TournamentMode.KnockoutSingle:
            case TournamentMode.KnockoutHomeAway:
                return 'Knockout';
            case TournamentMode.GroupsKnockoutSingle:
            case TournamentMode.GroupsKnockoutHomeAway:
                return 'GroupsThenKnockout';
        }
    }

    // Fallback: use the string `format` field
    switch (format) {
        case TournamentFormat.RoundRobin:
            return 'League';
        case TournamentFormat.KnockoutOnly:
            return 'Knockout';
        case TournamentFormat.GroupsThenKnockout:
        case TournamentFormat.GroupsWithHomeAwayKnockout:
            return 'GroupsThenKnockout';
        default:
            return 'League';
    }
}

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
        return g ? all.filter(s => s.groupId === g) : all;
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
            (t?.status === TournamentStatus.REGISTRATION_CLOSED || t?.status === TournamentStatus.ACTIVE);
    });

    readonly canResetSchedule = computed(() => {
        const t = this.tournament();
        const matches = this.tournamentMatches();
        const hasFinishedOrLive = matches.some(m => m.status === 'Finished' || m.status === 'Live');
        return (this.permissionsService.has(Permission.MANAGE_TOURNAMENTS) || this.isOwner(t)) &&
            (t?.status === TournamentStatus.REGISTRATION_CLOSED || t?.status === TournamentStatus.ACTIVE) &&
            matches.length > 0 && !hasFinishedOrLive;
    });

    readonly canSelectOpeningMatch = computed(() => {
        const t = this.tournament();
        const matches = this.tournamentMatches();
        return (this.permissionsService.has(Permission.MANAGE_TOURNAMENTS) || this.permissionsService.isOwner(t?.adminId || '')) &&
            (t?.status === TournamentStatus.REGISTRATION_CLOSED || t?.status === TournamentStatus.WAITING_FOR_OPENING_MATCH_SELECTION) &&
            matches.length === 0 &&
            ((t?.schedulingMode as any) === 'Random' || (t?.schedulingMode as any) === 0);
    });

    readonly isManualMode = computed(() => {
        const t = this.tournament();
        return (t?.schedulingMode as any) === 'Manual' || (t?.schedulingMode as any) === 1;
    });

    // ─── Actions ────────────────────────────────────

    /** Set the active tab. Lazily triggers data load for the tab if not already cached. */
    setTab(tab: DetailTab, destroyRef: DestroyRef): void {
        this.activeTab.set(tab);
        this.ensureTabDataLoaded(tab, destroyRef);
    }

    /** Called once when the route resolves the tournament id. */
    loadTournament(id: string, destroyRef: DestroyRef): void {
        this.tournamentId.set(id);
        this.isLoading.set(true);

        this.tournamentService.getTournamentById(id).pipe(
            takeUntilDestroyed(destroyRef),
            switchMap(data => {
                if (!data) {
                    this.isLoading.set(false);
                    return of(null);
                }
                this.tournamentStore.upsertTournament(data);

                // Determine which parallel calls to fire based on mode
                const cat = classifyMode(data.mode, data.format);
                const needsStandings = cat !== 'Knockout';
                const needsBracket = cat !== 'League';
                const hasGroups = cat === 'GroupsThenKnockout';

                return forkJoin({
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
                });
            })
        ).subscribe({
            next: result => {
                if (!result) return;

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

                // Groups
                const groupsArr = result.groups as Group[];
                if (groupsArr.length) {
                    this.groups.set(groupsArr);
                    if (!this.activeGroup()) this.activeGroup.set(groupsArr[0].id);
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
            },
            error: () => this.isLoading.set(false)
        });
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
    private ensureTabDataLoaded(tab: DetailTab, destroyRef: DestroyRef): void {
        if (this.loadedTabs().has(tab)) return;
        const id = this.tournamentId();
        if (!id) return;

        if (tab === 'standings' && !this.loadedTabs().has('standings')) {
            this.tournamentService.getStandings(id).pipe(
                takeUntilDestroyed(destroyRef),
                catchError(() => of([]))
            ).subscribe(data => {
                this.standings.set(data);
                this.markTabLoaded('standings');
            });
        }

        if (tab === 'bracket' && !this.loadedTabs().has('bracket')) {
            this.tournamentService.getBracket(id).pipe(
                takeUntilDestroyed(destroyRef),
                catchError(() => of(null))
            ).subscribe(data => {
                if (data) this.bracket.set(data);
                this.markTabLoaded('bracket');
            });
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
