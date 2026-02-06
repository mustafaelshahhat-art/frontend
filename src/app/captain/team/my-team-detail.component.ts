import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { TeamDetailComponent, TeamData, TeamPlayer } from '../../shared/components/team-detail';
import { TeamService } from '../../core/services/team.service';
import { Player } from '../../core/models/team.model';
import { AuthService } from '../../core/services/auth.service';
import { UIFeedbackService } from '../../shared/services/ui-feedback.service';
import { User, UserRole, UserStatus } from '../../core/models/user.model';

import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { TeamRequestService } from '../../core/services/team-request.service';
import { NotificationService } from '../../core/services/notification.service';
import { TeamJoinRequest } from '../../core/models/team-request.model';

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
                [showBackButton]="false"
                [canEditName]="isCaptain && teamData.isActive"
                [canAddPlayers]="isCaptain && teamData.isActive"
                [canRemovePlayers]="isCaptain && teamData.isActive"
                [canManageStatus]="false"
                [canManageInvitations]="isCaptain && teamData.isActive"
                [canSeeRequests]="isCaptain"
                [canSeeFinances]="isCaptain || isAdmin"
                [initialTab]="'players'"
                (playerAction)="handlePlayerAction($event)"
                (editName)="handleEditName($event)"
                (addPlayer)="onAddPlayerClick($event)"
                (tabChanged)="handleTabChange($event)"
                (respondRequest)="handleRespondRequest($event)">
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

            <!-- Case 2: Account Active, No Team, Has Invitation -->
            <div *ngIf="!isUserPending && pendingInvitations.length > 0" class="create-team-card invite-card animate-fade-in-up">
                <div class="icon-circle primary">
                    <span class="material-symbols-outlined">mail</span>
                </div>
                <h2>لديك دعوة للانضمام إلى فريق</h2>
                <div *ngFor="let invite of pendingInvitations" class="invite-item">
                    <p>فريق <strong>{{ invite.teamName }}</strong> يدعوك للانضمام إليه.</p>
                    <div class="flex gap-4">
                        <app-button (click)="acceptInvite(invite.id)" variant="primary" icon="check" class="flex-1">قبول</app-button>
                        <app-button (click)="rejectInvite(invite.id)" variant="outline" icon="close" class="flex-1">رفض</app-button>
                    </div>
                </div>
            </div>

            <!-- Case 3: Account Active, No Team, No Invitation -->
            <div *ngIf="!isUserPending && pendingInvitations.length === 0" class="create-team-card animate-fade-in-up">
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

        .invite-card {
            border-color: var(--primary);
            background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.05) 0%, rgba(var(--primary-rgb), 0.02) 100%);
        }

        .invite-item {
            background: var(--surface);
            padding: 20px;
            border-radius: 16px;
            border: 1px solid var(--border-visible);
            margin-bottom: 16px;
            
            p { margin-bottom: 16px; font-size: 1.1rem; }
        }

        .flex { display: flex; }
        .gap-4 { gap: 1rem; }
        .flex-1 { flex: 1; }

        .icon-circle.warning {
            background: rgba(255, 193, 7, 0.1);
        }

        .icon-circle.primary {
            background: rgba(var(--primary-rgb), 0.1);
        }

        .icon-circle.primary span {
            color: var(--primary);
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
export class MyTeamDetailComponent implements OnInit, OnDestroy {
    private readonly router = inject(Router);
    private readonly teamService = inject(TeamService);
    private readonly authService = inject(AuthService);
    private readonly uiFeedback = inject(UIFeedbackService);
    private readonly teamRequestService = inject(TeamRequestService);
    private readonly notificationService = inject(NotificationService);
    private readonly cdr = inject(ChangeDetectorRef);

    private userSubscription: Subscription | null = null;

    currentUser: User | null = null;
    teamData: TeamData | null = null;
    loading = true;
    isCaptain = false;
    isAdmin = false;
    newTeamName = '';
    creatingTeam = false;
    pendingInvitations: TeamJoinRequest[] = [];

    get isUserPending(): boolean {
        return this.currentUser?.status === UserStatus.PENDING;
    }

    ngOnInit(): void {
        this.currentUser = this.authService.getCurrentUser();
        if (!this.currentUser) {
            this.router.navigate(['/auth/login']);
            return;
        }

        this.isAdmin = (this.currentUser.role as string) === 'Admin';
        this.loadTeamData();

        // Subscribe to user state changes for reactive UI updates
        this.userSubscription = this.authService.user$.subscribe(user => {
            if (!user) return;

            // If user.teamId changed to null/undefined, clear team data immediately
            if (!user.teamId && this.teamData) {
                this.teamData = null;
                this.isCaptain = false;
                this.currentUser = user;
                this.loadInvitations();
                this.cdr.detectChanges();
            } else if (user.teamId && !this.teamData) {
                // User got a team, reload
                this.currentUser = user;
                this.loadTeamData();
            }
        });

        // Listen for real-time updates
        this.notificationService.joinRequestUpdate.subscribe(() => {
            if (this.currentUser) {
                // Refresh list
                if (this.teamData) {
                    if (this.isCaptain) {
                        this.teamRequestService.getRequestsForMyTeam().subscribe(requests => {
                            if (this.teamData) this.teamData.invitations = requests;
                            this.cdr.detectChanges();
                        });
                    }
                } else {
                    this.loadInvitations();
                }
            }
        });
    }

    ngOnDestroy(): void {
        if (this.userSubscription) {
            this.userSubscription.unsubscribe();
        }
    }

    loadInvitations(): void {
        this.teamRequestService.getMyInvitations().subscribe({
            next: (invites) => {
                this.pendingInvitations = invites;
                this.cdr.detectChanges();
            }
        });
    }

    acceptInvite(requestId: string): void {
        this.loading = true;
        this.teamRequestService.acceptRequest(requestId).subscribe({
            next: () => {
                this.uiFeedback.success('تمت الإضافة', 'أهلاً بك في فريقك الجديد!');
                // Update local status so UI refreshes
                setTimeout(() => {
                    this.authService.refreshUserProfile().subscribe(() => {
                        this.currentUser = this.authService.getCurrentUser();
                        this.loadTeamData();
                    });
                }, 500);
            },
            error: (err) => {
                this.loading = false;
                this.uiFeedback.error('فشل القبول', err.message);
            }
        });
    }

    rejectInvite(requestId: string): void {
        this.teamRequestService.rejectRequest(requestId).subscribe({
            next: () => {
                this.pendingInvitations = this.pendingInvitations.filter(i => i.id !== requestId);
                this.uiFeedback.success('تم الرفض', 'تم رفض الدعوة بنجاح');
                this.cdr.detectChanges();
            }
        });
    }

    loadTeamData(): void {
        if (!this.currentUser) return;

        // If user has a teamId, load that team first.
        // If not, we check if they might be a captain whose team is not linked (unlikely in new model but for safety).
        let loadTeam$: Observable<any> | null = null;

        if (this.currentUser.teamId) {
            loadTeam$ = this.teamService.getTeamById(this.currentUser.teamId);
        } else {
            // Fallback: check if this user is a captain of any team
            // (Useful if the User.TeamId wasn't updated for some reason)
            loadTeam$ = this.teamService.getTeamByCaptainId(this.currentUser.id);
        }

        if (!loadTeam$) {
            this.loading = false;
            this.teamData = null;
            this.isCaptain = false;
            this.loadInvitations();
            return;
        }

        this.loading = true;
        loadTeam$.subscribe({
            next: (team: any) => {
                if (team) {
                    this.teamData = this.convertToTeamData(team);
                    this.isCaptain = this.authService.isTeamOwner(team);

                    if (this.isCaptain) {
                        this.teamRequestService.getRequestsForMyTeam().subscribe(requests => {
                            if (this.teamData) this.teamData.invitations = requests;
                            this.cdr.detectChanges();
                        });
                    }
                } else {
                    this.teamData = null;
                    this.isCaptain = false;
                }
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.uiFeedback.error('خطأ', 'حدث خطأ أثناء تحميل بيانات الفريق');
                this.loading = false;
                this.cdr.detectChanges();
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
            this.uiFeedback.warning('تنبيه', 'يرجى إدخال اسم الفريق');
            return;
        }

        this.creatingTeam = true;
        this.teamService.createTeam(this.currentUser, this.newTeamName).subscribe({
            next: (response) => {
                this.authService.updateCurrentUser(response.updatedUser);
                this.currentUser = response.updatedUser;
                this.teamData = this.convertToTeamData(response.team);
                this.isCaptain = this.authService.isTeamOwner(response.team);
                this.creatingTeam = false;
                this.uiFeedback.success('مبروك!', `تم إنشاء فريق "${response.team.name}" بنجاح.`);
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.uiFeedback.error('فشل الإنشاء', err.message);
                this.creatingTeam = false;
                this.cdr.detectChanges();
            }
        });
    }

    handleTabChange(tab: string): void {
        if (!this.teamData) return;

        // Wrap updates in setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
        // if the service returns data synchronously (e.g. from cache)
        setTimeout(() => {
            switch (tab) {
                case 'players':
                    this.teamService.getTeamPlayers(this.teamData!.id).subscribe(players => {
                        if (this.teamData) {
                            this.teamData.players = players.map(p => ({
                                id: p.id,
                                name: p.name,
                                number: p.number || 0,
                                position: p.position || 'لاعب',
                                goals: p.goals || 0,
                                yellowCards: p.yellowCards || 0,
                                redCards: p.redCards || 0,
                                status: p.status || 'active'
                            }));
                            this.cdr.detectChanges();
                        }
                    });
                    break;
                case 'matches':
                    this.teamService.getTeamMatches(this.teamData!.id).subscribe(matches => {
                        if (this.teamData) {
                            this.teamData.matches = matches.map(m => ({
                                id: m.id,
                                opponent: m.homeTeamId === this.teamData?.id ? m.awayTeamName : m.homeTeamName,
                                date: new Date(m.date),
                                teamScore: m.homeTeamId === this.teamData?.id ? m.homeScore : m.awayScore,
                                opponentScore: m.homeTeamId === this.teamData?.id ? m.awayScore : m.homeScore,
                                status: m.status,
                                type: 'مباراة بطولة'
                            }));
                            this.cdr.detectChanges();
                        }
                    });
                    break;
                case 'finances':
                    this.teamService.getTeamFinancials(this.teamData!.id).subscribe(finances => {
                        if (this.teamData) {
                            this.teamData.finances = finances.map(f => ({
                                id: f.tournamentId,
                                title: f.tournamentName || 'تسجيل بطولة',
                                category: 'Tournament Registration',
                                amount: 0,
                                date: new Date(f.registeredAt),
                                status: f.status,
                                type: 'expense'
                            }));
                            this.cdr.detectChanges();
                        }
                    });
                    break;
                case 'requests':
                    if (this.isCaptain) {
                        this.teamRequestService.getRequestsForMyTeam().subscribe(requests => {
                            if (this.teamData) this.teamData.invitations = requests;
                            this.cdr.detectChanges();
                        });
                    }
                    break;
            }
        });
    }

    private convertToTeamData(team: any): TeamData {
        return {
            id: team.id,
            name: team.name,
            captainId: team.captainId || '',
            city: team.city || 'غير محدد',
            captainName: team.captainName || 'غير محدد',
            logo: team.logo || 'https://cdn-icons-png.flaticon.com/512/1165/1165217.png',
            status: team.playerCount >= 5 ? 'READY' : 'NOT_READY',
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
            matches: [],
            finances: [],
            invitations: []
        };
    }

    handleRespondRequest(event: { request: any, approve: boolean }): void {
        const { request, approve } = event;
        if (!this.teamData) return;

        this.teamRequestService.respondToRequest(this.teamData.id, request.id, approve).subscribe({
            next: () => {
                this.uiFeedback.success(approve ? 'تم القبول' : 'تم الرفض', 'تم تحديث حالة الطلب بنجاح');
                // Refresh invitations list for captain
                this.teamRequestService.getRequestsForMyTeam().subscribe(requests => {
                    if (this.teamData) this.teamData.invitations = requests;
                    // If approved, also refresh players list
                    if (approve) {
                        this.loadTeamData();
                    }
                    this.cdr.detectChanges();
                });
            },
            error: (err) => {
                this.uiFeedback.error('فشل المعالجة', err.error?.message || 'حدث خطأ أثناء معالجة الطلب');
            }
        });
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

        this.teamService.invitePlayerByDisplayId(this.teamData.id, playerId).subscribe({
            next: (response: any) => {
                this.uiFeedback.success('تم إرسال الدعوة', `تم إرسال دعوة للانضمام للبطل "${response.playerName}" بنجاح.`);
            },
            error: (err: any) => {
                this.uiFeedback.error('فشل الإضافة', err.error?.message || err.message || 'لم يتم العثور على لاعب بهذا الرقم أو أنه مسجل في فريق آخر');
            }
        });
    }

    handlePlayerAction(event: { player: TeamPlayer, action: 'activate' | 'deactivate' | 'ban' | 'remove' }): void {
        if (!this.isCaptain || !this.teamData) return;

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
                    this.uiFeedback.success('تم التحديث', 'تمت العملية بنجاح');
                }
            }
        });
    }
}
