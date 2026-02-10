import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TeamDetailComponent, TeamData } from '../../../shared/components/team-detail';
import { TeamService } from '../../../core/services/team.service';
import { Team } from '../../../core/models/team.model';
import { TeamStore } from '../../../core/stores/team.store';
import { AuthStore } from '../../../core/stores/auth.store';
import { CaptainLayoutService } from '../../../core/services/captain-layout.service';
import { UIFeedbackService } from '../../../shared/services/ui-feedback.service';

@Component({
    selector: 'app-captain-team-detail',
    standalone: true,
    imports: [
        CommonModule,
        TeamDetailComponent
    ],
    template: `
        @if (!loading() && teamData()) {
            <app-team-detail 
                [team]="teamData()!"
                [showBackButton]="true"
                [backRoute]="'/captain/team'"
                [canEditName]="isCaptain()"
                [canAddPlayers]="isCaptain()"
                [canRemovePlayers]="isCaptain()"
                [canManageStatus]="false"
                [canManageInvitations]="isCaptain()"
                [canDeleteTeam]="isCaptain()"
                [canSeeRequests]="isCaptain()"
                [canSeeFinances]="isCaptain()"
                [isInviteLoading]="false"
                [initialTab]="'players'"
                (playerAction)="handlePlayerAction($event)"
                (editName)="handleEditName($event)"
                (addPlayer)="handleAddPlayer($event)"
                (tabChanged)="handleTabChange($event)"
                (respondRequest)="handleRespondRequest($event)"
                (deleteTeam)="handleDeleteTeam()" />
        }

        @if (loading()) {
            <div class="flex-center p-xl">
                <p>جاري تحميل بيانات الفريق...</p>
            </div>
        }

        @if (!loading() && !teamData()) {
            <div class="flex-center p-xl">
                <p>لم يتم العثور على الفريق</p>
                <button class="btn btn-primary mt-m" (click)="router.navigate(['/captain/team'])">العودة للفرق</button>
            </div>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CaptainTeamDetailComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    public readonly router = inject(Router);
    private readonly teamService = inject(TeamService);
    private readonly teamStore = inject(TeamStore);
    private readonly authStore = inject(AuthStore);
    private readonly captainLayout = inject(CaptainLayoutService);
    private readonly uiFeedback = inject(UIFeedbackService);

    private readonly teamId = signal<string | null>(null);
    loading = signal(true);

    teamData = computed(() => {
        const id = this.teamId();
        const team = id ? this.teamStore.getTeamById(id) : null;
        return team ? this.convertToTeamData(team) : null;
    });

    isCaptain = computed(() => {
        const team = this.teamData();
        const user = this.authStore.currentUser();
        return !!(team && user && team.captainId === user?.id);
    });

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.teamId.set(id);
            this.loadTeam(id);
        }
    }

    loadTeam(id: string): void {
        this.loading.set(true);
        
        this.teamService.getTeamById(id).subscribe({
            next: (team) => {
                if (team) {
                    this.teamStore.upsertTeam(team);
                    this.updateLayout(team);
                }
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Error loading team:', err);
                this.uiFeedback.error('خطأ', 'فشل في تحميل بيانات الفريق');
                this.loading.set(false);
            }
        });
    }

    updateLayout(team: Team): void {
        this.captainLayout.setTitle('تفاصيل الفريق');
        this.captainLayout.setSubtitle(team.name);
        this.captainLayout.setBackAction(() => {
            this.router.navigate(['/captain/team']);
        });
    }

    private convertToTeamData(team: Team): TeamData {
        return {
            id: team.id,
            name: team.name,
            captainId: team.captainId || '',
            city: team.city || 'غير محدد',
            captainName: team.captainName || 'غير محدد',
            logo: team.logoUrl || team.logo || 'https://cdn-icons-png.flaticon.com/512/1165/1165217.png',
            status: (team.playerCount || 0) >= 8 ? 'READY' : 'NOT_READY',
            playerCount: team.playerCount,
            maxPlayers: team.maxPlayers,
            isActive: team.isActive ?? true,
            createdAt: team.createdAt ? new Date(team.createdAt) : new Date(),
            stats: {
                matches: team.stats?.matches || 0,
                wins: team.stats?.wins || 0,
                draws: team.stats?.draws || 0,
                losses: team.stats?.losses || 0,
                goalsFor: team.stats?.goalsFor || 0,
                goalsAgainst: team.stats?.goalsAgainst || 0,
                rank: team.stats?.rank || 0
            },
            players: (team.players || []).map(p => ({
                id: p.id,
                name: p.name,
                number: p.number || 0,
                position: p.position || 'Player',
                goals: p.goals || 0,
                yellowCards: p.yellowCards || 0,
                redCards: p.redCards || 0,
                status: p.status || 'active'
            })),
            matches: [],
            finances: []
        };
    }

    // Event handlers (implement as needed)
    handlePlayerAction(event: any): void {
        console.log('Player action:', event);
        // Implement player actions logic
    }

    handleEditName(name: string): void {
        console.log('Edit name:', name);
        // Implement edit name logic
    }

    handleAddPlayer(email: string): void {
        console.log('Add player:', email);
        // Implement add player logic
    }

    handleTabChange(tab: string): void {
        console.log('Tab changed:', tab);
    }

    handleRespondRequest(request: any): void {
        console.log('Respond to request:', request);
        // Implement request response logic
    }

    handleDeleteTeam(): void {
        const team = this.teamData();
        if (!team) return;

        if (confirm('هل أنت متأكد من حذف هذا الفريق؟')) {
            this.teamService.deleteTeam(team.id).subscribe({
                next: () => {
                    this.uiFeedback.success('تم الحذف', 'تم حذف الفريق بنجاح');
                    this.router.navigate(['/captain/team']);
                },
                error: (err) => {
                    this.uiFeedback.error('فشل الحذف', err.error?.message || 'حدث خطأ أثناء محاولة حذف الفريق');
                }
            });
        }
    }

    ngOnDestroy(): void {
        this.captainLayout.reset();
    }
}