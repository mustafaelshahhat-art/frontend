import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { TeamDetailComponent, TeamData, TeamPlayer } from '../../../../shared/components/team-detail';
import { TeamService } from '../../../../core/services/team.service';
import { Team } from '../../../../core/models/team.model';
import { MatchService } from '../../../../core/services/match.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
    selector: 'app-team-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        TeamDetailComponent
    ],
    template: `
        <!-- Show content if we have team data, even if still loading/refreshing -->
        <app-team-detail 
            *ngIf="team"
            [team]="team"
            [showBackButton]="true"
            [backRoute]="'/admin/teams'"
            [canEditName]="false"
            [canAddPlayers]="false"
            [canRemovePlayers]="false"
            [canManageStatus]="true"
            [canDeleteTeam]="isCaptainOrAdmin"
            (playerAction)="handlePlayerAction($event)"
            (tabChanged)="handleTabChange($event)"
            (deleteTeam)="handleDeleteTeam()"
            (disableTeam)="handleDisableTeam()">
        </app-team-detail>

        <!-- Only show centering spinner if we have NO data yet -->
        <div *ngIf="isLoading && !team" class="flex-center p-xl" style="min-height: 400px;">
            <div class="spinner-lg"></div>
        </div>

        <div *ngIf="!isLoading && !team" class="flex-center p-xl">
            <p>لم يتم العثور على الفريق</p>
            <button class="btn btn-primary mt-m" (click)="router.navigate(['/admin/teams'])">العودة للفرق</button>
        </div>
    `
})
export class TeamDetailPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    public readonly router = inject(Router);
    private readonly teamService = inject(TeamService);
    private readonly matchService = inject(MatchService);
    private readonly uiFeedback = inject(UIFeedbackService);
    private readonly authService = inject(AuthService);
    private readonly cdr = inject(ChangeDetectorRef);

    team: TeamData | null = null;
    isLoading = true;
    isCaptainOrAdmin = false;

    ngOnInit(): void {
        this.checkNavigationState();
        this.loadTeam();
    }

    private checkNavigationState(): void {
        const stateTeam = history.state?.['team'];

        if (stateTeam) {
            console.log('TeamDetailPage: Found team in navigation state');
            try {
                this.team = this.mapDtoToTeamData(stateTeam);
                this.isLoading = false;
                this.checkPermissions();
                this.cdr.detectChanges();
            } catch (err) {
                console.warn('Could not map state team:', err);
            }
        }
    }

    loadTeam(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            this.isLoading = false;
            return;
        }

        if (!this.team) {
            this.isLoading = true;
        }

        this.teamService.getTeamById(id).subscribe({
            next: (teamDto: Team | undefined) => {
                if (teamDto) {
                    console.log('Team DTO received from API:', teamDto);
                    this.team = this.mapDtoToTeamData(teamDto);
                    this.checkPermissions();
                    this.loadMatches(id);
                    this.cdr.detectChanges();
                }
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                if (!this.team) {
                    this.uiFeedback.error('خطأ', 'فشل في تحميل بيانات الفريق');
                }
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    checkPermissions(): void {
        const user = this.authService.getCurrentUser();
        if (user && this.team) {
            this.isCaptainOrAdmin = user.role === 'Admin' || (user.id === this.team.captainId);
        }
    }

    handleDeleteTeam(): void {
        if (!this.team) return;
        const message = 'جاري حذف الفريق...';
        // Note: We use authService.getCurrentUser() assuming it's up to date.
        // The TeamService.deleteTeam needs a User object to update local state.
        const user = this.authService.getCurrentUser();
        if (!user) return;

        this.teamService.deleteTeam(this.team.id, user).subscribe({
            next: (updatedUser) => {
                // Update local user state if needed (AuthService might need a method to set user)
                this.authService.updateCurrentUser(updatedUser);
                this.uiFeedback.success('تم الحذف', 'تم حذف الفريق بنجاح');
                this.router.navigate(['/admin/teams']);
            },
            error: (err) => {
                console.error('Delete failed', err);
                this.uiFeedback.error('خطأ', 'فشل حذف الفريق');
            }
        });
    }

    handleDisableTeam(): void {
        if (!this.team) return;

        this.teamService.disableTeam(this.team.id).subscribe({
            next: () => {
                this.uiFeedback.success('تم التعطيل', 'تم تعطيل الفريق وانسحابه من أي بطولة حالية');
                this.loadTeam(); // Reload data to reflect changes
            },
            error: (err) => {
                console.error('Disable failed', err);
                this.uiFeedback.error('خطأ', 'فشل في تعطيل الفريق');
            }
        });
    }

    loadMatches(teamId: string): void {
        this.matchService.getMatchesByTeam(teamId).subscribe({
            next: (matches) => {
                if (this.team) {
                    this.team = {
                        ...this.team,
                        matches: matches.map(m => ({
                            id: m.id,
                            opponent: m.homeTeamId === teamId ? m.awayTeamName : m.homeTeamName,
                            opponentLogo: m.homeTeamId === teamId ? m.awayTeamLogoUrl : m.homeTeamLogoUrl,
                            date: m.date ? new Date(m.date) : new Date(),
                            score: `${m.homeScore}-${m.awayScore}`,
                            teamScore: m.homeTeamId === teamId ? m.homeScore : m.awayScore,
                            opponentScore: m.homeTeamId === teamId ? m.awayScore : m.homeScore,
                            status: m.status,
                            type: 'مباراة دوري'
                        }))
                    };
                    this.cdr.detectChanges();
                }
            },
            error: () => {
                console.error('Failed to load team matches');
            }
        });
    }

    private getMatchResultStatus(match: any, teamId: string): 'win' | 'draw' | 'loss' {
        if (match.status !== 'Finished') return 'draw';
        const isHome = match.homeTeamId === teamId;
        const teamScore = isHome ? match.homeScore : match.awayScore;
        const opponentScore = isHome ? match.awayScore : match.homeScore;

        if (teamScore > opponentScore) return 'win';
        if (teamScore < opponentScore) return 'loss';
        return 'draw';
    }

    private mapDtoToTeamData(dto: any): TeamData {
        return {
            id: dto.id,
            name: dto.name,
            captainId: dto.captainId,
            city: dto.city || 'غير محدد',
            captainName: dto.captainName || 'غير معروف',
            logo: dto.logo || 'assets/images/team-placeholder.png',
            status: 'READY',
            isActive: dto.isActive,
            createdAt: dto.founded ? new Date(dto.founded) : new Date(),
            stats: {
                matches: dto.stats?.matches || dto.stats?.Matches || 0,
                wins: dto.stats?.wins || dto.stats?.Wins || 0,
                draws: dto.stats?.draws || dto.stats?.Draws || 0,
                losses: dto.stats?.losses || dto.stats?.Losses || 0,
                goalsFor: dto.stats?.goalsFor || dto.stats?.GoalsFor || 0,
                goalsAgainst: dto.stats?.goalsAgainst || dto.stats?.GoalsAgainst || 0,
                rank: dto.stats?.rank || dto.stats?.Rank || 0
            },
            players: (dto.players || []).map((p: any) => ({
                id: p.id,
                name: p.name,
                number: p.number || 0,
                position: p.position || 'لاعب',
                goals: p.goals || 0,
                yellowCards: p.yellowCards || 0,
                redCards: p.redCards || 0,
                status: p.status || 'active'
            })),
            matches: [],
            finances: []
        };
    }

    handlePlayerAction(event: { player: TeamPlayer, action: 'activate' | 'deactivate' | 'ban' | 'remove' }): void {
        const { player, action } = event;
        const config = {
            activate: { title: 'تفعيل اللاعب', message: `هل أنت متأكد من تفعيل اللاعب "${player.name}"؟`, btn: 'تفعيل الآن', type: 'info' as const },
            deactivate: { title: 'تعطيل اللاعب', message: `هل أنت متأكد من تعطيل اللاعب "${player.name}"؟`, btn: 'تعطيل اللاعب', type: 'danger' as const },
            ban: { title: 'حظر اللاعب', message: `هل أنت متأكد من حظر اللاعب "${player.name}"؟`, btn: 'حظر نهائي', type: 'danger' as const },
            remove: { title: 'إزالة اللاعب', message: `هل أنت متأكد من إزالة اللاعب "${player.name}" من الفريق؟`, btn: 'إزالة الآن', type: 'danger' as const }
        };

        const { title, message, btn, type } = config[action];
        this.uiFeedback.confirm(title, message, btn, type).subscribe((confirmed: boolean) => {
            if (confirmed) {
                // TODO: Call API to update player status
                if (action === 'activate') player.status = 'active';
                else if (action === 'deactivate') player.status = 'suspended';
                else if (action === 'ban') player.status = 'banned';
                else if (action === 'remove' && this.team) {
                    this.team.players = this.team.players.filter(p => p.id !== player.id);
                }

                this.uiFeedback.success('تم التحديث', 'تمت العملية بنجاح');
            }
        });
    }

    handleTabChange(tab: string): void {
        console.log('Tab changed to:', tab);
        // يمكنك إضافة أي logic إضافي هنا
    }
}
