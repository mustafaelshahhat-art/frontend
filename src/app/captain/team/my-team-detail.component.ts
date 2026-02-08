import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, ViewChild, effect, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { TeamDetailComponent, TeamData, TeamPlayer } from '../../shared/components/team-detail';
import { TeamService } from '../../core/services/team.service';
import { Player, Team } from '../../core/models/team.model';
import { AuthService } from '../../core/services/auth.service';
import { UIFeedbackService } from '../../shared/services/ui-feedback.service';
import { User, UserRole, UserStatus } from '../../core/models/user.model';

import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { TeamRequestService } from '../../core/services/team-request.service';
import { NotificationService } from '../../core/services/notification.service';
import { TeamJoinRequest } from '../../core/models/team-request.model';
import { TeamStore } from '../../core/stores/team.store';
import { AuthStore } from '../../core/stores/auth.store';

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
        <div *ngIf="!loading() && teamData()" class="my-team-page">
            <app-team-detail 
                [team]="teamData()!"
                [showBackButton]="false"
                [canEditName]="isCaptain && teamData()!.isActive"
                [canAddPlayers]="isCaptain && teamData()!.isActive"
                [canRemovePlayers]="isCaptain && teamData()!.isActive"
                [canManageStatus]="false"
                [canManageInvitations]="isCaptain && teamData()!.isActive"
                [canDeleteTeam]="isCaptain"
                [canSeeRequests]="isCaptain"
                [canSeeFinances]="isCaptain || isAdmin"
                [isInviteLoading]="isAddingPlayer"
                [initialTab]="'players'"
                (playerAction)="handlePlayerAction($event)"
                (editName)="handleEditName($event)"
                (addPlayer)="onAddPlayerClick($event)"
                (tabChanged)="handleTabChange($event)"
                (respondRequest)="handleRespondRequest($event)"
                (deleteTeam)="handleDeleteTeam()">
            </app-team-detail>
        </div>

        <div *ngIf="loading()" class="loading-container">
            <p>جاري التحميل...</p>
        </div>

        <div *ngIf="!loading() && !teamData()" class="no-team-container">
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
    private readonly authStore = inject(AuthStore);
    private readonly teamStore = inject(TeamStore);

    @ViewChild(TeamDetailComponent) teamDetail!: TeamDetailComponent;

    private userSubscription: Subscription | null = null;

    currentUser: User | null = null;
    teamData = signal<TeamData | null>(null);
    loading = signal<boolean>(true);
    private isLoadingTeam = false;
    isCaptain = false;
    isAdmin = false;
    isAddingPlayer = false;
    newTeamName = '';
    creatingTeam = false;
    pendingInvitations: TeamJoinRequest[] = [];

    constructor() {
        // Reactive effect: Watch TeamStore and Auth state for real-time updates
        effect(() => {
            const teams = this.teamStore.teams(); // Track store changes
            const user = this.authStore.currentUser(); // Track user changes (REACTIVE SIGNAL)

            // Collect current state without tracking it
            const currentData = untracked(() => this.teamData());
            const isLoading = untracked(() => this.isLoadingTeam);

            // Update local reference
            untracked(() => { this.currentUser = user; });

            if (!user) {
                this.teamData.set(null);
                this.isCaptain = false;
                return;
            }

            // Case 1: User has no team id - reset UI if it was showing a team
            if (!user.teamId) {
                if (currentData) {
                    this.teamData.set(null);
                    this.isCaptain = false;
                    this.loadInvitations();
                }
                this.loading.set(false);
                return;
            }

            // Case 2: User has a team id - check store
            const storeTeam = this.teamStore.getTeamById(user.teamId);

            if (storeTeam) {
                // Team is in store - update UI
                const converted = this.convertToTeamData(storeTeam);

                // Mix in invitations from current state (they aren't in the store model)
                converted.invitations = currentData?.invitations || [];

                // Simple check to prevent redundant sets (and potential cycles)
                if (!currentData || currentData.id !== converted.id || currentData.players?.length !== converted.players?.length) {
                    this.teamData.set(converted);
                    this.isCaptain = this.authService.isTeamOwner(storeTeam);
                }
                this.loading.set(false);
            } else if (!isLoading) {
                // User has a team ID but it's not in the store - fetch it
                // We use setTimeout to defer to next tick to avoid NG0100
                setTimeout(() => this.loadTeamData(), 0);
            }
        });
    }

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

        // Initial load is handled by the effect in constructor
        this.loadInvitations();

        // Listen for real-time updates
        this.notificationService.joinRequestUpdate.subscribe(() => {
            if (this.currentUser) {
                // Refresh list
                const currentData = this.teamData();
                if (currentData) {
                    if (this.isCaptain) {
                        this.teamRequestService.getRequestsForMyTeam().subscribe(requests => {
                            const updatedData = { ...currentData, invitations: requests };
                            this.teamData.set(updatedData);
                        });
                    }
                } else {
                    this.loadInvitations();
                }
            }
        });
    }

    ngOnDestroy(): void {
        // effects clean up themselves
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
        this.loading.set(true);
        this.teamRequestService.acceptRequest(requestId).subscribe({
            next: () => {
                this.uiFeedback.success('تمت الإضافة', 'أهلاً بك في فريقك الجديد!');

                // Immediately refresh profile to get new teamId
                this.authService.refreshUserProfile().subscribe({
                    next: (updatedUser) => {
                        if (updatedUser?.teamId) {
                            // The effect will now trigger because authStore.currentUser() changed
                            // but we also call loadTeamData for immediate response
                            this.loadTeamData();
                        } else {
                            // Fallback if refresh didn't show teamId yet
                            this.loading.set(false);
                            this.loadInvitations();
                        }
                    },
                    error: () => {
                        this.loading.set(false);
                        this.loadInvitations();
                    }
                });
            },
            error: (err) => {
                this.loading.set(false);
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
            // Use getTeamByIdSilent to handle 404 gracefully (deleted teams)
            loadTeam$ = this.teamService.getTeamByIdSilent(this.currentUser.teamId);
        } else {
            // Fallback: check if this user is a captain of any team
            // (Useful if the User.TeamId wasn't updated for some reason)
            loadTeam$ = this.teamService.getTeamByCaptainId(this.currentUser.id);
        }

        if (this.isLoadingTeam) return;

        if (!loadTeam$) {
            this.loading.set(false);
            this.teamData.set(null);
            this.isCaptain = false;
            this.loadInvitations();
            return;
        }

        this.isLoadingTeam = true;
        // Use timeout to avoid NG0100 if called synchronously
        setTimeout(() => this.loading.set(true), 0);

        loadTeam$.subscribe({
            next: (team: any) => {
                if (team) {
                    // Verify that the user is still a member or captain of this team
                    const isMember = team.captainId === this.currentUser?.id ||
                        (team.players && team.players.some((p: any) => p.userId === this.currentUser?.id || p.id === this.currentUser?.id));

                    if (!isMember) {
                        console.warn('Membership lost - clearing team association');
                        this.authService.clearTeamAssociation();
                        this.teamData.set(null);
                        this.isCaptain = false;
                        this.loadInvitations();
                        this.loading.set(false);
                        return;
                    }

                    // Add/Update team in store for reactive updates
                    const existingTeam = this.teamStore.getTeamById(team.id);
                    if (existingTeam) {
                        this.teamStore.updateTeam(team);
                    } else {
                        this.teamStore.addTeam(team);
                    }

                    const converted = this.convertToTeamData(team);
                    this.teamData.set(converted);
                    this.isCaptain = this.authService.isTeamOwner(team);

                    if (this.isCaptain) {
                        this.teamRequestService.getRequestsForMyTeam().subscribe(requests => {
                            const current = this.teamData();
                            if (current) {
                                this.teamData.set({ ...current, invitations: requests });
                            }
                        });
                    }
                } else {
                    // Team was deleted (404 returned null from getTeamByIdSilent)
                    console.warn('Team not found (null) - cleaning up');
                    this.authService.clearTeamAssociation();
                    this.teamData.set(null);
                    this.isCaptain = false;
                    this.loadInvitations();
                    // Force a profile refresh to sync with server
                    this.authService.refreshUserProfile().subscribe();
                }
                this.loading.set(false);
                this.isLoadingTeam = false;
            },
            error: (err) => {
                this.loading.set(false);
                this.isLoadingTeam = false;

                // If we get a 404 here, it's definitely gone
                if (err.status === 404) {
                    console.warn('Team 404 detected in error block - cleaning up');
                    this.authService.clearTeamAssociation();
                    this.teamData.set(null);
                    this.authService.refreshUserProfile().subscribe();
                }
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
                // 1. Set team data first so that the userSubscription sees it and doesn't trigger loadTeamData
                const converted = this.convertToTeamData(response.team);
                this.teamData.set(converted);
                this.isCaptain = this.authService.isTeamOwner(response.team);

                // 2. Update current user and notify other components
                this.authService.updateCurrentUser(response.updatedUser);
                this.currentUser = response.updatedUser;

                // 3. Cleanup local UI state
                this.creatingTeam = false;
                this.loading.set(false); // Ensure loading is off if it were on
                this.uiFeedback.success('مبروك!', `تم إنشاء فريق "${response.team.name}" بنجاح.`);
            },
            error: (err) => {
                this.uiFeedback.error('فشل الإنشاء', err.message);
                this.creatingTeam = false;
                this.loading.set(false);
            }
        });
    }

    handleTabChange(tab: string): void {
        if (!this.teamData) return;

        // Wrap updates in setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
        // if the service returns data synchronously (e.g. from cache)
        setTimeout(() => {
            const current = this.teamData();
            if (!current) return;

            switch (tab) {
                case 'players':
                    this.teamService.getTeamPlayers(current.id).subscribe(players => {
                        const updated = {
                            ...current,
                            players: players.map(p => ({
                                id: p.id,
                                name: p.name,
                                number: p.number || 0,
                                position: p.position || 'لاعب',
                                goals: p.goals || 0,
                                yellowCards: p.yellowCards || 0,
                                redCards: p.redCards || 0,
                                status: p.status || 'active'
                            }))
                        };
                        this.teamData.set(updated);
                    });
                    break;
                case 'matches':
                    this.teamService.getTeamMatches(current.id).subscribe(matches => {
                        const updated = {
                            ...current,
                            matches: matches.map(m => ({
                                id: m.id,
                                opponent: m.homeTeamId === current.id ? m.awayTeamName : m.homeTeamName,
                                date: new Date(m.date),
                                teamScore: m.homeTeamId === current.id ? m.homeScore : m.awayScore,
                                opponentScore: m.homeTeamId === current.id ? m.awayScore : m.homeScore,
                                status: m.status,
                                type: 'مباراة بطولة'
                            }))
                        };
                        this.teamData.set(updated);
                    });
                    break;
                case 'finances':
                    this.teamService.getTeamFinancials(current.id).subscribe(finances => {
                        const updated = {
                            ...current,
                            finances: finances.map(f => ({
                                id: f.tournamentId,
                                title: f.tournamentName || 'تسجيل بطولة',
                                category: 'Tournament Registration',
                                amount: 0,
                                date: new Date(f.registeredAt),
                                status: f.status,
                                type: 'expense'
                            }))
                        };
                        this.teamData.set(updated);
                    });
                    break;
                case 'requests':
                    if (this.isCaptain) {
                        this.teamRequestService.getRequestsForMyTeam().subscribe(requests => {
                            this.teamData.set({ ...current, invitations: requests });
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
            status: team.playerCount >= 8 ? 'READY' : 'NOT_READY',
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
        const currentData = this.teamData();
        if (!currentData) return;

        this.teamRequestService.respondToRequest(currentData.id, request.id, approve).subscribe({
            next: () => {
                this.uiFeedback.success(approve ? 'تم القبول' : 'تم الرفض', 'تم تحديث حالة الطلب بنجاح');
                // Refresh invitations list for captain
                this.teamRequestService.getRequestsForMyTeam().subscribe(requests => {
                    const latest = this.teamData();
                    if (latest) {
                        this.teamData.set({ ...latest, invitations: requests });
                    }
                    // If approved, also refresh players list
                    if (approve) {
                        this.loadTeamData();
                    }
                });
            },
            error: (err) => {
                this.uiFeedback.error('فشل المعالجة', err.error?.message || 'حدث خطأ أثناء معالجة الطلب');
            }
        });
    }

    handleEditName(newName: string): void {
        const current = this.teamData();
        if (!current || !newName.trim()) return;

        this.teamService.updateTeam({ id: current.id, name: newName } as any).subscribe({
            next: (updated) => {
                this.teamData.set({ ...current, name: updated.name });
                this.uiFeedback.success('تم التحديث', 'تم تغيير اسم الفريق بنجاح');
            },
            error: () => this.uiFeedback.error('خطأ', 'فشل في تحديث اسم الفريق')
        });
    }

    onAddPlayerClick(playerId: string): void {
        const current = this.teamData();
        if (!current || !this.currentUser) return;

        this.isAddingPlayer = true;
        this.teamService.invitePlayerByDisplayId(current.id, playerId).subscribe({
            next: (response: any) => {
                this.isAddingPlayer = false;
                this.uiFeedback.success('تم إرسال الدعوة', `تم إرسال دعوة للانضمام للبطل "${response.playerName}" بنجاح.`);
                this.teamDetail.closeInviteModal();
            },
            error: (err: any) => {
                this.isAddingPlayer = false;
                this.uiFeedback.error('فشل الإضافة', err.error?.message || err.message || 'لم يتم العثور على لاعب بهذا الرقم أو أنه مسجل في فريق آخر');
            }
        });
    }

    handlePlayerAction(event: { player: TeamPlayer, action: 'activate' | 'deactivate' | 'ban' | 'remove' }): void {
        const current = this.teamData();
        if (!this.isCaptain || !current) return;

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
                    this.teamService.removePlayer(current.id, player.id.toString()).subscribe(() => {
                        this.teamData.set({
                            ...current,
                            players: current.players.filter((p: any) => p.id !== player.id)
                        });
                        this.uiFeedback.success('تم الاستبعاد', 'تم إزالة اللاعب من الفريق');
                    });
                } else {
                    this.uiFeedback.success('تم التحديث', 'تمت العملية بنجاح');
                }
            }
        });
    }

    handleDeleteTeam(): void {
        const current = this.teamData();
        if (!this.isCaptain || !current) return;

        this.uiFeedback.confirm(
            'حذف الفريق',
            'هل أنت متأكد من حذف هذا الفريق؟ سيتم أرشفة الفريق وإلغاء عضوية جميع اللاعبين.',
            'حذف نهائي',
            'danger'
        ).subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.teamService.deleteTeam(current.id).subscribe({
                    next: () => {
                        this.uiFeedback.success('تم الحذف', 'تم حذف الفريق بنجاح');
                        // Update user state and clear team data
                        this.authService.refreshUserProfile().subscribe(() => {
                            this.currentUser = this.authService.getCurrentUser();
                            this.teamData.set(null);
                            this.isCaptain = false;
                            this.loadInvitations();
                        });
                    },
                    error: (err) => {
                        this.uiFeedback.error('فشل الحذف', err.error?.message || 'حدث خطأ أثناء محاولة حذف الفريق');
                    }
                });
            }
        });
    }
}
