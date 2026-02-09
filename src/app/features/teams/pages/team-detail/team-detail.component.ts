import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap, tap, finalize } from 'rxjs/operators';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { TeamDetailComponent, TeamData, TeamPlayer } from '../../../../shared/components/team-detail';
import { TeamService } from '../../../../core/services/team.service';
import { Team } from '../../../../core/models/team.model';
import { MatchService } from '../../../../core/services/match.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TeamStore } from '../../../../core/stores/team.store';
import { MatchStore } from '../../../../core/stores/match.store';
import { Match } from '../../../../core/models/tournament.model';
import { AdminLayoutService } from '../../../../core/services/admin-layout.service';
import { UserRole } from '../../../../core/models/user.model';

@Component({
    selector: 'app-team-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        TeamDetailComponent
    ],
    template: `
        <!-- Show content if we have team data, even if still loading/refreshing -->
        @if (team) {
            <app-team-detail 
                [team]="team"
                [showBackButton]="true"
                [backRoute]="'/admin/teams'"
                [canEditName]="false"
                [canAddPlayers]="false"
                [canRemovePlayers]="false"
                [canManageStatus]="true"
                [canDeleteTeam]="isCaptainOrAdmin"
                (playerAction)="handlePlayerAction($event)"
                (deleteTeam)="handleDeleteTeam()"
                (disableTeam)="handleDisableTeam()" />
        }

        <!-- Only show centering spinner if we have NO data yet -->
        @if (isLoading() && !team) {
            <div class="flex-center p-xl loading-viewport">
                <div class="spinner-lg"></div>
            </div>
        }

        @if (!isLoading() && !team) {
            <div class="flex-center p-xl">
                <p>لم يتم العثور على الفريق</p>
                <button class="btn btn-primary mt-m" (click)="router.navigate(['/admin/teams'])">العودة للفرق</button>
            </div>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [`
        .loading-viewport {
            min-height: 400px;
        }
    `]
})
export class TeamDetailPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    public readonly router = inject(Router);
    private readonly teamService = inject(TeamService);
    private readonly matchService = inject(MatchService);
    private readonly uiFeedback = inject(UIFeedbackService);
    private readonly authService = inject(AuthService);
    private readonly teamStore: TeamStore = inject(TeamStore);
    private readonly matchStore: MatchStore = inject(MatchStore);
    private readonly adminLayout = inject(AdminLayoutService);

    teamId = signal<string | null>(null);
    isLoading = signal<boolean>(true);

    // Computed Matches for this team (Real-Time Source of Truth)
    teamMatches = computed(() => {
        const id = this.teamId();
        if (!id) return [];
        return this.matchStore.matches().filter((m: Match) => m.homeTeamId === id || m.awayTeamId === id).map((m: Match) => ({
            id: m.id,
            opponent: m.homeTeamId === id ? m.awayTeamName : m.homeTeamName,
            opponentLogo: m.homeTeamId === id ? m.awayTeamLogoUrl : m.homeTeamLogoUrl,
            date: m.date ? new Date(m.date) : new Date(),
            score: `${m.homeScore}-${m.awayScore}`,
            teamScore: m.homeTeamId === id ? m.homeScore : m.awayScore,
            opponentScore: m.homeTeamId === id ? m.awayScore : m.homeScore,
            status: m.status,
            type: 'مباراة دوري'
        }));
    });

    // Computed Stats from Matches
    teamStats = computed(() => {
        const matches = this.teamMatches();
        const stats = { matches: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, rank: 0 };

        matches.filter((m: { status: string }) => m.status === 'Finished').forEach((m: { teamScore: number, opponentScore: number }) => {
            stats.matches++;
            stats.goalsFor += m.teamScore || 0;
            stats.goalsAgainst += m.opponentScore || 0;
            if (m.teamScore! > m.opponentScore!) stats.wins++;
            else if (m.teamScore! < m.opponentScore!) stats.losses++;
            else stats.draws++;
        });
        return stats;
    });

    // Combined Team Data View Model
    teamData = computed((): TeamData | null => {
        const id = this.teamId();
        const t = id ? this.teamStore.getTeamById(id) : null;
        if (!t) return null;

        const stats = this.teamStats();

        // Map Team Store Entity + Computed Stats + Computed Matches -> View Model
        return {
            id: t.id,
            name: t.name,
            captainId: t.captainId,
            city: t.city || 'غير محدد',
            captainName: t.captainName || 'غير معروف',
            logo: t.logoUrl || t.logo || 'assets/images/team-placeholder.png',
            status: 'READY',
            isActive: t.isActive ?? false,
            createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
            stats: stats,
            players: (t.players || []).map((p: { id: string, name: string, number?: number, position?: string, goals?: number, yellowCards?: number, redCards?: number, status?: string }) => ({
                id: p.id,
                name: p.name,
                number: p.number || 0,
                position: p.position || 'لاعب',
                goals: p.goals || 0,
                yellowCards: p.yellowCards || 0,
                redCards: p.redCards || 0,
                status: p.status || 'active'
            })),
            matches: this.teamMatches(),
            finances: []
        };
    });

    // Helper for template compatibility (if needed, or update template to use teamData())
    get team(): TeamData | null { return this.teamData(); }

    isCaptainOrAdmin = false;

    ngOnInit(): void {
        this.adminLayout.reset();
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.teamId.set(id);
            this.loadInitialData(id);
        } else {
            this.router.navigate(['/admin/teams']);
        }
    }

    loadInitialData(id: string): void {
        this.isLoading.set(true);

        this.teamService.getTeamById(id).pipe(
            tap(data => {
                if (data) {
                    this.teamStore.upsertTeam(data);
                    this.checkPermissions(data);
                }
            }),
            switchMap(() => this.matchService.getMatchesByTeam(id)),
            tap(matches => {
                matches.forEach(m => {
                    if (!this.matchStore.getMatchById(m.id)) this.matchStore.addMatch(m);
                    else this.matchStore.updateMatch(m);
                });
            }),
            finalize(() => this.isLoading.set(false))
        ).subscribe({
            error: () => this.isLoading.set(false)
        });
    }

    checkPermissions(team: Team): void {
        const user = this.authService.getCurrentUser();
        if (user && team) {
            this.isCaptainOrAdmin = user.role === UserRole.ADMIN || (user.id === team.captainId);
        }
    }

    handleDeleteTeam(): void {
        const t = this.teamData();
        if (!t) return;

        this.teamService.deleteTeam(t.id).subscribe({
            next: () => {
                this.authService.refreshUserProfile().subscribe();
                this.uiFeedback.success('تم الحذف', 'تم حذف الفريق بنجاح');
                this.router.navigate(['/admin/teams']);
            },
            error: (err) => {
                this.uiFeedback.error('خطأ', err.error?.message || 'فشل حذف الفريق');
            }
        });
    }

    handleDisableTeam(): void {
        const t = this.teamData();
        if (!t) return;

        this.teamService.disableTeam(t.id).subscribe({
            next: () => {
                this.uiFeedback.success('تم التعطيل', 'تم تعطيل الفريق وانسحابه من أي بطولة حالية');
                // Store updates via RealTime event
            },
            error: () => {
                this.uiFeedback.error('خطأ', 'فشل في تعطيل الفريق');
            }
        });
    }

    handlePlayerAction(event: { player: TeamPlayer, action: string }): void {
        const { player, action } = event;
        const config = {
            activate: { title: 'تفعيل اللاعب', message: `هل أنت متأكد من تفعيل اللاعب "${player.name}"؟`, btn: 'تفعيل الآن', type: 'info' as const },
            deactivate: { title: 'تعطيل اللاعب', message: `هل أنت متأكد من تعطيل اللاعب "${player.name}"؟`, btn: 'تعطيل اللاعب', type: 'danger' as const },
            ban: { title: 'حظر اللاعب', message: `هل أنت متأكد من حظر اللاعب "${player.name}"؟`, btn: 'حظر نهائي', type: 'danger' as const },
            remove: { title: 'إزالة اللاعب', message: `هل أنت متأكد من إزالة اللاعب "${player.name}" من الفريق؟`, btn: 'إزالة الآن', type: 'danger' as const }
        };

        const { title, message, btn, type } = config[action as keyof typeof config];
        this.uiFeedback.confirm(title, message, btn, type).subscribe((confirmed: boolean) => {
            if (confirmed) {
                const t = this.teamData();
                if (!t) return;

                if (action === 'remove') {
                    this.teamService.removePlayer(t.id, player.id).subscribe({
                        next: () => {
                            this.uiFeedback.success('تم الحذف', 'تم إزالة اللاعب من الفريق');
                        },
                        error: () => {
                            this.uiFeedback.error('خطأ', 'فشل في إزالة اللاعب');
                        }
                    });
                } else {
                    this.uiFeedback.info('قريباً', 'هذه الميزة غير مفعلة حالياً');
                }
            }
        });
    }
}
