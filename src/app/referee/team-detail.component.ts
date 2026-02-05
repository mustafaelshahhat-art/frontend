import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TeamDetailComponent, TeamData } from '../shared/components/team-detail';
import { TeamService } from '../core/services/team.service';
import { UIFeedbackService } from '../shared/services/ui-feedback.service';

@Component({
    selector: 'app-referee-team-detail',
    standalone: true,
    imports: [
        CommonModule,
        TeamDetailComponent
    ],
    template: `
        <div *ngIf="!loading && teamData">
            <app-team-detail 
                [team]="teamData"
                [showBackButton]="true"
                [backRoute]="'/referee/matches'"
                [canEditName]="false"
                [canAddPlayers]="false"
                [canRemovePlayers]="false"
                [canManageStatus]="false">
            </app-team-detail>
        </div>

        <div *ngIf="loading" class="flex-center p-xl">
            <p>جاري تحميل بيانات الفريق...</p>
        </div>
    `
})
export class RefereeTeamDetailComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly teamService = inject(TeamService);
    private readonly uiFeedback = inject(UIFeedbackService);

    teamData: TeamData | null = null;
    loading = true;

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.loadTeam(id);
        }
    }

    loadTeam(id: string): void {
        this.teamService.getTeamById(id).subscribe({
            next: (team) => {
                if (team) {
                    this.teamData = this.convertToTeamData(team);
                }
                this.loading = false;
            },
            error: () => {
                this.uiFeedback.error('خطأ', 'فشل في تحميل بيانات الفريق');
                this.loading = false;
            }
        });
    }

    private convertToTeamData(team: any): TeamData {
        return {
            id: team.id,
            name: team.name,
            city: team.city || 'غير محدد',
            captainName: team.captainName || 'غير محدد',
            logo: team.logoUrl || 'https://cdn-icons-png.flaticon.com/512/1165/1165217.png',
            status: team.isReady ? 'READY' : 'NOT_READY',
            isActive: team.isActive ?? true,
            createdAt: team.createdAt ? new Date(team.createdAt) : new Date(),
            stats: {
                matches: team.stats?.totalMatches || 0,
                wins: team.stats?.wins || 0,
                draws: team.stats?.draws || 0,
                losses: team.stats?.losses || 0,
                goalsFor: team.stats?.goalsFor || 0,
                goalsAgainst: team.stats?.goalsAgainst || 0,
                rank: team.stats?.rank || 0
            },
            players: (team.players || []).map((p: any) => ({
                id: p.id,
                name: p.name,
                number: p.number || 0,
                position: p.position || 'لاعب',
                goals: p.goals || 0,
                yellowCards: p.yellowCards || 0,
                redCards: p.redCards || 0,
                status: p.status || 'active'
            })),
            matches: (team.matches || []).map((m: any) => ({
                id: m.id,
                opponent: m.opponent || 'فريق منافس',
                date: new Date(m.date),
                score: m.score || '0-0',
                status: m.status || 'draw',
                type: m.type || 'مباراة'
            })),
            finances: [] // المحكم لا يرى المالية
        };
    }
}
