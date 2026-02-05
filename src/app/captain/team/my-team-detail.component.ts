import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TeamDetailComponent, TeamData, TeamPlayer } from '../../shared/components/team-detail';
import { TeamService } from '../../core/services/team.service';
import { Player } from '../../core/models/team.model';
import { AuthService } from '../../core/services/auth.service';
import { UIFeedbackService } from '../../shared/services/ui-feedback.service';
import { User, UserRole, UserStatus } from '../../core/models/user.model';

import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../shared/components/button/button.component';

@Component({
    selector: 'app-my-team-detail',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TeamDetailComponent,
        ButtonComponent
    ],
    template: `
        <div *ngIf="!loading && teamData" class="my-team-page">
            <app-team-detail 
                [team]="teamData"
                [showBackButton]="true"
                [backRoute]="'/captain/dashboard'"
                [canEditName]="isCaptain"
                [canAddPlayers]="isCaptain"
                [canRemovePlayers]="isCaptain"
                [canManageStatus]="false"
                [initialTab]="'players'"
                (playerAction)="handlePlayerAction($event)"
                (editName)="handleEditName($event)"
                (addPlayer)="onAddPlayerClick($event)"
                (tabChanged)="handleTabChange($event)">
            </app-team-detail>
        </div>

        <div *ngIf="loading" class="loading-container">
            <p>جاري التحميل...</p>
        </div>

        <div *ngIf="!loading && !teamData" class="no-team-container">
            <!-- Case 1: Account Pending -->
            <div *ngIf="isUserPending" class="create-team-card pending-card animate-fade-in-up">
                <div class="icon-circle warning">
                    <span class="material-symbols-outlined">pending_actions</span>
                </div>
                <h2>حسابك قيد المراجعة</h2>
                <p>عذراً، لا يمكنك إنشاء فريق حتى يتم اعتماد حسابك من قبل إدارة البطولة. يرجى الانتظار، سيتم إخطارك فور التفعيل.</p>
                
                <app-button variant="ghost" icon="refresh" (click)="loadTeamData()" class="w-full">
                    تحديث الحالة
                </app-button>
            </div>

            <!-- Case 2: Account Active, No Team -->
            <div *ngIf="!isUserPending" class="create-team-card animate-fade-in-up">
                <div class="icon-circle">
                    <span class="material-symbols-outlined">groups</span>
                </div>
                <h2>أنت لست عضواً في أي فريق</h2>
                <p>قم بإنشاء فريقك الخاص الآن وقد فريقك نحو البطولة!</p>
                
                <div class="create-form">
                    <div class="input-group">
                        <span class="material-symbols-outlined">shield</span>
                        <input type="text" [(ngModel)]="newTeamName" placeholder="أدخل اسم الفريق الجديد" class="team-input">
                    </div>
                    <app-button (click)="createNewTeam()" [isLoading]="creatingTeam" variant="primary" size="lg" icon="add" class="w-full">
                        إنشاء فريق جديد
                    </app-button>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .my-team-page {
            min-height: 100vh;
        }

        .loading-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 60vh;
            font-size: 1.2rem;
            color: var(--text-muted);
        }

        .no-team-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 80vh;
            padding: 20px;
        }

        .create-team-card {
            background: var(--surface-light);
            border: 1px solid var(--border-visible);
            border-radius: 30px;
            padding: 40px;
            text-align: center;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }

        .icon-circle {
            width: 80px;
            height: 80px;
            background: var(--primary-light);
            background-opacity: 0.1;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
        }

        .icon-circle span {
            font-size: 40px;
            color: var(--primary);
        }

        .create-team-card h2 {
            font-family: 'Poppins', sans-serif;
            font-weight: 900;
            color: var(--text-main);
            margin-bottom: 12px;
        }

        .create-team-card p {
            color: var(--text-muted);
            margin-bottom: 32px;
            line-height: 1.6;
        }

        .create-form {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .input-group {
            position: relative;
            display: flex;
            align-items: center;
        }

        .input-group span {
            position: absolute;
            right: 16px;
            color: var(--primary);
            opacity: 0.5;
        }

        .team-input {
            width: 100%;
            padding: 16px 48px 16px 16px;
            background: var(--surface);
            border: 1px solid var(--border-visible);
            border-radius: 12px;
            color: var(--text-main);
            font-size: 1rem;
            outline: none;
            transition: all 0.3s ease;
        }

        .team-input:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 4px rgba(var(--primary-rgb), 0.1);
        }

        .icon-circle.warning {
            background: rgba(255, 193, 7, 0.1);
        }

        .icon-circle.warning span {
            color: #ffc107;
        }

        .pending-card {
            border-color: rgba(255, 193, 7, 0.2);
            background: linear-gradient(135deg, rgba(19, 27, 46, 0.7) 0%, rgba(25, 35, 60, 0.7) 100%);
        }

        .w-full { width: 100%; }
    `]
})
export class MyTeamDetailComponent implements OnInit {
    private readonly router = inject(Router);
    private readonly teamService = inject(TeamService);
    private readonly authService = inject(AuthService);
    private readonly uiFeedback = inject(UIFeedbackService);
    private readonly cdr = inject(ChangeDetectorRef);

    currentUser: User | null = null;
    teamData: TeamData | null = null;
    loading = true;
    isCaptain = false;
    newTeamName = '';
    creatingTeam = false;

    get isUserPending(): boolean {
        return this.currentUser?.status === UserStatus.PENDING;
    }

    ngOnInit(): void {
        this.currentUser = this.authService.getCurrentUser();
        if (!this.currentUser) {
            this.router.navigate(['/auth/login']);
            return;
        }

        this.isCaptain = this.authService.hasRole(UserRole.CAPTAIN);
        this.loadTeamData();
    }

    loadTeamData(): void {
        if (!this.currentUser) return;

        const loadTeam$ = this.isCaptain
            ? this.teamService.getTeamByCaptainId(this.currentUser.id)
            : this.currentUser.teamId
                ? this.teamService.getTeamById(this.currentUser.teamId)
                : null;

        if (!loadTeam$) {
            this.loading = false;
            this.teamData = null; // Ensure it's null to show create team UI
            return;
        }

        this.loading = true;
        loadTeam$.subscribe({
            next: (team) => {
                setTimeout(() => {
                    if (team) {
                        this.teamData = this.convertToTeamData(team);
                    } else {
                        this.teamData = null;
                    }
                    this.loading = false;
                    this.cdr.detectChanges();
                });
            },
            error: (err) => {
                setTimeout(() => {
                    this.uiFeedback.error('خطأ', 'حدث خطأ أثناء تحميل بيانات الفريق');
                    this.loading = false;
                    this.cdr.detectChanges();
                });
            }
        });
    }

    createNewTeam(): void {
        if (!this.currentUser) return;

        if (this.isUserPending) {
            this.uiFeedback.error('تنبيه', 'لا يمكنك إنشاء فريق قبل تفعيل حسابك من قبل الإدارة');
            return;
        }

        if (!this.newTeamName.trim()) {
            this.uiFeedback.warning('تنبيه', 'يرجى إدخال اسم المشروع/الفريق');
            return;
        }

        this.creatingTeam = true;
        this.teamService.createTeam(this.currentUser, this.newTeamName).subscribe({
            next: (response) => {
                setTimeout(() => {
                    this.authService.updateCurrentUser(response.updatedUser);
                    this.currentUser = response.updatedUser;
                    this.isCaptain = true;
                    this.teamData = this.convertToTeamData(response.team);
                    this.creatingTeam = false;
                    this.cdr.detectChanges();
                    this.uiFeedback.success('مبروك!', `تم إنشاء فريق "${response.team.name}" بنجاح.`);
                });
            },
            error: (err) => {
                setTimeout(() => {
                    this.uiFeedback.error('فشل الإنشاء', err.message);
                    this.creatingTeam = false;
                    this.cdr.detectChanges();
                });
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
                type: m.type || 'مباراة ودية'
            })),
            finances: (team.finances || []).map((f: any) => ({
                id: f.id,
                title: f.title || 'معاملة مالية',
                category: f.category || 'other',
                amount: f.amount || 0,
                date: new Date(f.date),
                status: f.status || 'pending',
                type: f.type || 'expense'
            }))
        };
    }

    handleEditName(newName: string): void {
        if (!this.teamData || !newName.trim()) return;

        this.teamService.updateTeam({ id: this.teamData.id, name: newName } as any).subscribe({
            next: (updated) => {
                if (this.teamData) this.teamData.name = updated.name;
                this.uiFeedback.success('تم التحديث', 'تم تغيير اسم الفريق بنجاح');
            },
            error: () => this.uiFeedback.error('خطأ', 'فشل في تحديث اسم الفريق')
        });
    }

    onAddPlayerClick(playerId: string): void {
        if (!this.teamData || !this.currentUser) return;

        this.teamService.addPlayerByDisplayId(this.teamData.id, playerId, this.currentUser).subscribe({
            next: (newPlayer: Player) => {
                const teamPlayer: TeamPlayer = {
                    id: isNaN(Number(newPlayer.id)) ? Math.floor(Math.random() * 100000) : Number(newPlayer.id),
                    name: newPlayer.name,
                    number: 0,
                    position: 'N/A',
                    goals: newPlayer.goals || 0,
                    yellowCards: newPlayer.yellowCards || 0,
                    redCards: newPlayer.redCards || 0,
                    status: 'active'
                };
                this.teamData!.players.push(teamPlayer);
                this.uiFeedback.success('تمت الإضافة', `تم إضافة اللاعب "${newPlayer.name}" للفريق بنجاح`);
            },
            error: (err: any) => {
                this.uiFeedback.error('فشل الإضافة', err.message || 'لم يتم العثور على لاعب بهذا الرقم أو أنه مسجل في فريق آخر');
            }
        });
    }

    handlePlayerAction(event: { player: TeamPlayer, action: 'activate' | 'deactivate' | 'ban' | 'remove' }): void {
        if (!this.isCaptain) return;

        const { player, action } = event;
        const config = {
            activate: { title: 'تفعيل اللاعب', message: `هل أنت متأكد من تفعيل "${player.name}"؟`, btn: 'تفعيل', type: 'info' as const },
            deactivate: { title: 'تعليق اللاعب', message: `هل أنت متأكد من تعليق "${player.name}"؟`, btn: 'تعليق', type: 'warning' as const },
            ban: { title: 'حظر اللاعب', message: `هل أنت متأكد من حظر "${player.name}" نهائياً؟`, btn: 'حظر', type: 'danger' as const },
            remove: { title: 'استبعاد لاعب', message: `هل أنت متأكد من استبعاد "${player.name}" من الفريق؟`, btn: 'استبعاد', type: 'danger' as const }
        };

        const { title, message, btn, type } = config[action];
        this.uiFeedback.confirm(title, message, btn, type).subscribe((confirmed: boolean) => {
            if (confirmed) {
                if (action === 'remove') {
                    this.teamService.removePlayer(this.teamData!.id, player.id.toString()).subscribe(() => {
                        this.teamData!.players = this.teamData!.players.filter(p => p.id !== player.id);
                        this.uiFeedback.success('تم الاستبعاد', 'تم إزالة اللاعب من الفريق');
                    });
                } else {
                    // العمليات الأخرى للأدمن عادة، لكن الكابتن هنا يستخدم الـ remove
                    this.uiFeedback.success('تم التحديث', 'تمت العملية بنجاح');
                }
            }
        });
    }

    handleTabChange(tab: string): void {
        console.log('Tab changed to:', tab);
    }
}
