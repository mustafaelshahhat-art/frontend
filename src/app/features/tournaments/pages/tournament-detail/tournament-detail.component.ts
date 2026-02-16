import {
    Component, OnInit, inject, ChangeDetectionStrategy, OnDestroy,
    HostBinding, DestroyRef, signal, computed
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';

// Core
import { ContextNavigationService } from '../../../../core/navigation/context-navigation.service';
import { TournamentService } from '../../../../core/services/tournament.service';
import { MatchService } from '../../../../core/services/match.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PermissionsService } from '../../../../core/services/permissions.service';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { LayoutOrchestratorService } from '../../../../core/services/layout-orchestrator.service';
import { TournamentStore } from '../../../../core/stores/tournament.store';
import { MatchStore } from '../../../../core/stores/match.store';
import { Permission } from '../../../../core/permissions/permissions.model';
import {
    TournamentStatus, MatchStatus, RegistrationStatus,
    SchedulingMode, TournamentFormat, Match, MatchEventType
} from '../../../../core/models/tournament.model';
import { UserRole, UserStatus, TeamRole } from '../../../../core/models/user.model';

// Store (component-scoped)
import { TournamentDetailStore, DetailTab } from '../../stores/tournament-detail.store';

// Shared UI
import { FilterComponent } from '../../../../shared/components/filter/filter.component';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { SmartImageComponent } from '../../../../shared/components/smart-image/smart-image.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';

// Modals
import { TeamRegistrationModalComponent } from '../../components/team-registration-modal/team-registration-modal.component';
import { OpeningMatchModalComponent } from '../../components/opening-match-modal/opening-match-modal.component';

// Tab components
import { InfoTabComponent } from '../../tabs/info-tab/info-tab.component';
import { StandingsTabComponent } from '../../tabs/standings-tab/standings-tab.component';
import { MatchesTabComponent } from '../../tabs/matches-tab/matches-tab.component';
import { BracketTabComponent } from '../../tabs/bracket-tab/bracket-tab.component';
import { TeamsTabComponent } from '../../tabs/teams-tab/teams-tab.component';

// Utils
import { getTournamentStatusLabel, getRegStatusLabel as _regStatusLabel, getRegStatusType as _regStatusType } from '../../utils/tournament-status.utils';

@Component({
    selector: 'app-tournament-detail',
    standalone: true,
    imports: [
        CommonModule, RouterModule, FormsModule,
        FilterComponent, CardComponent, BadgeComponent, ButtonComponent,
        EmptyStateComponent, SmartImageComponent, IconComponent,
        HasPermissionDirective,
        TeamRegistrationModalComponent, OpeningMatchModalComponent,
        // Tab components (lightweight — each is OnPush standalone)
        InfoTabComponent,
        StandingsTabComponent,
        MatchesTabComponent,
        BracketTabComponent,
        TeamsTabComponent,
    ],
    providers: [TournamentDetailStore],
    templateUrl: './tournament-detail.component.html',
    styleUrls: ['./tournament-detail.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TournamentDetailComponent implements OnInit, OnDestroy {
    // ── Injections ──
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly tournamentService = inject(TournamentService);
    private readonly matchService = inject(MatchService);
    private readonly authService = inject(AuthService);
    private readonly permissionsService = inject(PermissionsService);
    private readonly uiFeedback = inject(UIFeedbackService);
    private readonly tournamentStore = inject(TournamentStore);
    private readonly matchStore = inject(MatchStore);
    private readonly layoutOrchestrator = inject(LayoutOrchestratorService);
    private readonly navService = inject(ContextNavigationService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly sanitizer = inject(DomSanitizer);

    /** Component-scoped store — injected into all tab children */
    readonly store = inject(TournamentDetailStore);

    // ── Enums exposed to template ──
    Permission = Permission;
    TournamentStatus = TournamentStatus;
    MatchStatus = MatchStatus;
    RegistrationStatus = RegistrationStatus;
    SchedulingMode = SchedulingMode;

    @HostBinding('style.--progress-val')
    get progressValStyle(): SafeStyle {
        return this.sanitizer.bypassSecurityTrustStyle(this.getProgressPercent().toString());
    }

    // ── Local UI signals ──
    isGeneratingMatches = signal(false);
    isRegisterModalVisible = signal(false);
    isOpeningMatchModalVisible = signal(false);

    // ── Delegated computeds (just aliases into the store) ──
    get tournament() { return this.store.tournament; }
    get isLoading() { return this.store.isLoading; }
    get activeTab() { return this.store.activeTab; }
    get tabs() { return this.store.tabs; }
    get tournamentMatches() { return this.store.tournamentMatches; }
    get myRegistration() { return this.store.myRegistration; }
    get isRegistered() { return this.store.isRegistered; }
    get isCaptain() { return this.store.isCaptain; }
    get canEditTournament() { return this.store.canEditTournament; }
    get canStartRegistration() { return this.store.canStartRegistration; }
    get canCloseRegistration() { return this.store.canCloseRegistration; }
    get canGenerateMatches() { return this.store.canGenerateMatches; }
    get canStartTournament() { return this.store.canStartTournament; }
    get canManageDraw() { return this.store.canManageDraw; }
    get canResetSchedule() { return this.store.canResetSchedule; }
    get canSelectOpeningMatch() { return this.store.canSelectOpeningMatch; }
    get isManualMode() { return this.store.isManualMode; }
    get showStandings() { return this.store.showStandings; }
    get showBracket() { return this.store.showBracket; }

    isUserPending = computed(() => this.authService.getCurrentUser()?.status === UserStatus.PENDING);

    canGenerateSchedule = computed(() => false); // Replaced by automated flow

    // ── Lifecycle ──

    ngOnInit(): void {
        // Read initial tab from query params (persist across refresh)
        const initialTab = this.route.snapshot.queryParamMap.get('tab') as DetailTab | null;
        if (initialTab) {
            this.store.activeTab.set(initialTab);
        }

        // Subscribe to route param changes
        this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
            const id = params.get('id');
            if (id) {
                this.updateLayout();
                this.store.loadTournament(id, this.destroyRef);
            }
        });
    }

    ngOnDestroy(): void {
        this.layoutOrchestrator.reset();
    }

    // ── Tab switching (with query param persistence) ──

    onTabChange(tab: any): void {
        const t = tab as DetailTab;
        this.store.setTab(t, this.destroyRef);

        // Update URL query param without triggering navigation
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { tab: t },
            queryParamsHandling: 'merge',
            replaceUrl: true
        });
    }

    // ── Layout ──

    updateLayout(): void {
        const tournament = this.tournament();
        this.layoutOrchestrator.setTitle('تفاصيل البطولة');
        this.layoutOrchestrator.setSubtitle(tournament ? tournament.name : 'تحميل...');
        this.layoutOrchestrator.setBackAction(() => this.navigateBack());
    }

    // ── Navigation ──

    navigateBack(): void {
        const prefix = this.navService.getRootPrefix();
        if (prefix === '/guest') {
            this.router.navigate(['/guest/tournaments']);
            return;
        }
        if (prefix === '/admin' || prefix === '/creator') {
            this.navService.navigateTo('tournaments');
        } else {
            this.router.navigate(['/player/tournaments']);
        }
    }

    // ── Status helpers ──

    getStatusLabel(status: TournamentStatus | undefined): string {
        return getTournamentStatusLabel(status);
    }

    getRegStatusLabel(status: string): string { return _regStatusLabel(status); }
    getRegStatusType(status: string): 'primary' | 'gold' | 'danger' | 'info' | 'warning' | 'success' | 'muted' | 'neutral' | 'live' {
        return _regStatusType(status);
    }

    getProgressPercent(): number {
        const t = this.tournament();
        if (!t?.maxTeams) return 0;
        return (t.currentTeams / t.maxTeams) * 100;
    }

    // ── Admin Actions ──

    editTournament(): void {
        const t = this.tournament();
        if (t) this.navService.navigateTo(['tournaments', 'edit', t.id]);
    }

    deleteTournament(): void {
        const t = this.tournament();
        if (!t) return;

        this.uiFeedback.confirm(
            'حذف البطولة',
            `هل أنت متأكد من حذف بطولة "${t.name}"؟ هذا الإجراء لا يمكن التراجع عنه.`,
            'حذف نهائي',
            'danger'
        ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.store.isLoading.set(true);
                this.tournamentService.deleteTournament(t.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
                    next: () => {
                        this.uiFeedback.success('تم الحذف', 'تم حذف البطولة بنجاح');
                        this.navService.navigateTo('tournaments');
                    },
                    error: (err: any) => {
                        this.store.isLoading.set(false);
                        this.uiFeedback.error('فشل الحذف', err.error?.message || 'تعذّر حذف البطولة.');
                    }
                });
            }
        });
    }

    toggleStatus(): void {
        const t = this.tournament();
        if (!t) return;

        this.store.isLoading.set(true);

        if (t.status === TournamentStatus.DRAFT) {
            this.tournamentService.updateTournament(t.id, { status: TournamentStatus.REGISTRATION_OPEN }).pipe(
                takeUntilDestroyed(this.destroyRef)
            ).subscribe({
                next: (updated) => {
                    this.tournamentStore.updateTournament(updated);
                    this.store.isLoading.set(false);
                    this.uiFeedback.success('تم التحديث', 'تم فتح باب التسجيل بنجاح');
                },
                error: (err: any) => {
                    this.store.isLoading.set(false);
                    this.uiFeedback.error('فشل فتح التسجيل', err.error?.message || 'تعذّر فتح باب التسجيل.');
                }
            });
        } else if (t.status === TournamentStatus.REGISTRATION_OPEN) {
            this.tournamentService.closeRegistration(t.id).pipe(
                takeUntilDestroyed(this.destroyRef)
            ).subscribe({
                next: (updated) => {
                    this.tournamentStore.updateTournament(updated);
                    this.store.isLoading.set(false);
                    this.uiFeedback.success('تم التحديث', 'تم إغلاق التسجيل بنجاح');
                },
                error: (err: any) => {
                    this.store.isLoading.set(false);
                    this.uiFeedback.error('فشل إغلاق التسجيل', err.error?.message || 'تعذّر إغلاق باب التسجيل.');
                }
            });
        } else {
            this.tournamentService.updateTournament(t.id, { status: TournamentStatus.REGISTRATION_OPEN }).pipe(
                takeUntilDestroyed(this.destroyRef)
            ).subscribe({
                next: (updated) => {
                    this.tournamentStore.updateTournament(updated);
                    this.store.isLoading.set(false);
                    this.uiFeedback.success('تم التحديث', `تم تغيير حالة البطولة`);
                },
                error: (err: any) => {
                    this.store.isLoading.set(false);
                    this.uiFeedback.error('فشل تغيير الحالة', err.error?.message || 'تعذّر تغيير حالة البطولة.');
                }
            });
        }
    }

    generateMatches(): void {
        const t = this.tournament();
        if (!t) return;

        this.isGeneratingMatches.set(true);
        this.tournamentService.generateMatches(t.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => {
                this.isGeneratingMatches.set(false);
                this.uiFeedback.success('تم بنجاح', 'تم توليد جدول المباريات بنجاح.');
                this.store.reload(this.destroyRef);
            },
            error: (err: any) => {
                this.isGeneratingMatches.set(false);
                this.uiFeedback.error('فشل توليد الجدول', err.error?.message || 'تعذّر توليد المباريات.');
            }
        });
    }

    startTournament(): void {
        const t = this.tournament();
        if (!t) return;

        this.uiFeedback.confirm(
            'بدء البطولة',
            `هل أنت متأكد من بدء "${t.name}"؟ بمجرد البدء، لن تتمكن من تعديل الجدول.`,
            'تأكيد البدء',
            'info'
        ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.store.isLoading.set(true);
                this.tournamentService.startTournament(t.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
                    next: (updated) => {
                        this.tournamentStore.updateTournament(updated);
                        this.store.isLoading.set(false);
                        this.uiFeedback.success('تم بنجاح', 'تم بدء البطولة بنجاح');
                        this.store.reload(this.destroyRef);
                    },
                    error: (err: any) => {
                        this.store.isLoading.set(false);
                        this.uiFeedback.error('فشل بدء البطولة', err.error?.message || 'تعذّر بدء البطولة.');
                    }
                });
            }
        });
    }

    startManualDraw(): void {
        const t = this.tournament();
        if (t) this.navService.navigateTo(['tournaments', t.id, 'manual-draw']);
    }

    resetSchedule(): void {
        const t = this.tournament();
        if (!t) return;

        this.uiFeedback.confirm(
            'حذف الجدولة وتصفير القرعة',
            'هل أنت متأكد من حذف جميع المباريات والقرعة الحالية؟',
            'حذف الجدولة',
            'danger'
        ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(confirmed => {
            if (confirmed) {
                this.store.isLoading.set(true);
                this.tournamentService.resetSchedule(t.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
                    next: () => {
                        this.uiFeedback.success('تم الحذف', 'تم حذف الجدول بنجاح. يمكنك الآن إعادة الجدولة.');
                        this.matchStore.clearTournamentMatches(t.id);
                        this.store.reload(this.destroyRef);
                    },
                    error: (err: any) => {
                        this.store.isLoading.set(false);
                        this.uiFeedback.error('فشل حذف الجدول', err.error?.message || 'تعذّر حذف جدول المباريات.');
                    }
                });
            }
        });
    }

    // ── Registration / Captain Actions ──

    registerTeam(): void {
        this.isRegisterModalVisible.set(true);
    }

    closeRegisterModal(): void {
        this.isRegisterModalVisible.set(false);
    }

    onRegistrationSuccess(): void {
        this.isRegisterModalVisible.set(false);
    }

    withdrawTeam(): void {
        const t = this.tournament();
        const reg = this.myRegistration();
        if (!t || !reg) return;

        this.uiFeedback.confirm(
            'انسحاب من البطولة',
            `هل أنت متأكد من الانسحاب من بطولة ${t.name}؟`,
            'تأكيد الانسحاب',
            'danger'
        ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(confirmed => {
            if (confirmed) {
                this.tournamentService.withdrawTeam(t.id, reg.teamId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
                    next: () => {
                        this.uiFeedback.success('تم الانسحاب', 'تم سحب فريقك من البطولة بنجاح');
                        this.store.reload(this.destroyRef);
                    },
                    error: (err: any) => this.uiFeedback.error('فشل الانسحاب', err.error?.message || 'تعذّر الانسحاب.')
                });
            }
        });
    }

    // ── Opening Match ──

    selectOpeningMatch(): void {
        const t = this.tournament();
        const matches = this.tournamentMatches();
        if (!t || matches.length > 0) {
            this.uiFeedback.warning('تنبيه', 'لا يمكن تعديل مباراة الافتتاح بعد توليد الجدول.');
            return;
        }
        this.isOpeningMatchModalVisible.set(true);
    }

    closeOpeningMatchModal(): void {
        this.isOpeningMatchModalVisible.set(false);
    }

    onOpeningMatchSelected(event: { homeTeamId: string; awayTeamId: string }): void {
        const t = this.tournament();
        if (!t) return;

        this.store.isLoading.set(true);
        this.tournamentService.setOpeningMatch(t.id, event.homeTeamId, event.awayTeamId).pipe(
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: (matches) => {
                this.isOpeningMatchModalVisible.set(false);
                if (matches?.length) {
                    matches.forEach((m: Match) => {
                        if (!this.matchStore.getMatchById(m.id)) this.matchStore.addMatch(m);
                        else this.matchStore.updateMatch(m);
                    });
                    this.uiFeedback.success('تم بنجاح', `تم تحديد الافتتاح وتوليد ${matches.length} مباراة.`);
                } else {
                    this.uiFeedback.success('تم بنجاح', 'تم تحديد مباراة الافتتاح بنجاح.');
                }
                setTimeout(() => {
                    this.store.reload(this.destroyRef);
                    this.store.isLoading.set(false);
                }, 1000);
            },
            error: (err: any) => {
                this.isOpeningMatchModalVisible.set(false);
                this.store.isLoading.set(false);
                this.uiFeedback.error('فشل الافتتاحية', err.error?.message || 'تعذّر تحديد مباراة الافتتاح.');
            }
        });
    }

    // ── Emergency ──

    emergencyStart(): void {
        const t = this.tournament();
        if (!t) return;

        this.uiFeedback.confirm(
            '⚠️ إجراء طارئ: بدء البطولة',
            `هل أنت متأكد من فرض بدء بطولة "${t.name}"؟`,
            'تأكيد البدء الطارئ',
            'danger'
        ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(confirmed => {
            if (confirmed) {
                this.store.isLoading.set(true);
                this.tournamentService.emergencyStart(t.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
                    next: (updated) => {
                        this.tournamentStore.upsertTournament(updated);
                        this.uiFeedback.success('تم التدخل بنجاح', 'تم تغيير حالة البطولة إلى نشطة');
                        this.store.isLoading.set(false);
                    },
                    error: (err: any) => {
                        this.store.isLoading.set(false);
                        this.uiFeedback.error('فشل البدء الطارئ', err.error?.message || 'تعذّر تنفيذ البدء الطارئ.');
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
            `هل أنت متأكد من فرض إنهاء بطولة "${t.name}"؟`,
            'تأكيد الإنهاء الطارئ',
            'danger'
        ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(confirmed => {
            if (confirmed) {
                this.store.isLoading.set(true);
                this.tournamentService.emergencyEnd(t.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
                    next: (updated) => {
                        this.tournamentStore.upsertTournament(updated);
                        this.uiFeedback.success('تم التدخل بنجاح', 'تم إنهاء البطولة بنجاح');
                        this.store.isLoading.set(false);
                    },
                    error: (err: any) => {
                        this.store.isLoading.set(false);
                        this.uiFeedback.error('فشل الإنهاء الطارئ', err.error?.message || 'تعذّر تنفيذ الإنهاء الطارئ.');
                    }
                });
            }
        });
    }
}
