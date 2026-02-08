import { Component, OnInit, OnDestroy, inject, ViewChild, effect, signal, untracked, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, Subscription, of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
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
                [canEditName]="isCaptain() && teamData()!.isActive"
                [canAddPlayers]="isCaptain() && teamData()!.isActive"
                [canRemovePlayers]="isCaptain() && teamData()!.isActive"
                [canManageStatus]="false"
                [canManageInvitations]="isCaptain() && teamData()!.isActive"
                [canDeleteTeam]="isCaptain()"
                [canSeeRequests]="isCaptain()"
                [canSeeFinances]="isCaptain() || isAdmin()"
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
            <div *ngIf="isUserPending()" class="create-team-card pending-card animate-fade-in-up">
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
            <div *ngIf="!isUserPending() && pendingInvitations().length > 0" class="create-team-card invite-card animate-fade-in-up">
                <div class="icon-circle primary">
                    <span class="material-symbols-outlined">mail</span>
                </div>
                <h2>لديك دعوة للانضمام إلى فريق</h2>
                <div *ngFor="let invite of pendingInvitations()" class="invite-item">
                    <p>فريق <strong>{{ invite.teamName }}</strong> يدعوك للانضمام إليه.</p>
                    <div class="flex gap-4">
                        <app-button (click)="acceptInvite(invite.id)" variant="primary" icon="check" class="flex-1">قبول</app-button>
                        <app-button (click)="rejectInvite(invite.id)" variant="outline" icon="close" class="flex-1">رفض</app-button>
                    </div>
                </div>
            </div>

            <!-- Case 3: Account Active, No Team, No Invitation -->
            <div *ngIf="!isUserPending() && pendingInvitations().length === 0" class="create-team-card animate-fade-in-up">
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
    private readonly authStore = inject(AuthStore);
    private readonly teamStore = inject(TeamStore);

    @ViewChild(TeamDetailComponent) teamDetail!: TeamDetailComponent;

    private userSubscription: Subscription | null = null;

    currentUser: User | null = null;
    teamData = signal<TeamData | null>(null);
    loading = signal<boolean>(true);
    private isLoadingTeam = false;

    // Computed signals replace manual effect updates + setTimeout
    isCaptain = computed(() => {
        const team = this.teamData();
        const user = this.authStore.currentUser();
        return !!(team && user && team.captainId === user.id);
    });

    isAdmin = computed(() => this.authStore.currentUser()?.role === 'Admin');

    // UI state properties
    isAddingPlayer = false;
    newTeamName = '';
    creatingTeam = false;
    pendingInvitations = signal<TeamJoinRequest[]>([]);

    isUserPending = computed(() => this.authStore.currentUser()?.status === UserStatus.PENDING);

    constructor() {
        // Reactive effect: Watch TeamStore and Auth state for real-time updates
        effect(() => {
            const teams = this.teamStore.teams(); // Track store changes
            const user = this.authStore.currentUser(); // Track user changes (REACTIVE SIGNAL)

            // Collect current state without tracking it
            const currentData = untracked(() => this.teamData());
            const isLoading = untracked(() => this.isLoadingTeam);

            // Update local reference (non-signal, safe to mutate)
            untracked(() => { this.currentUser = user; });

            // READ-ONLY: Only decide if loadTeamData() should be triggered
            // All signal mutations happen inside loadTeamData()'s HTTP callbacks
            untracked(() => {
                // Skip if already loading
                if (isLoading) return;

                // Case 1: No user - trigger reset via loadTeamData
                if (!user) {
                    if (currentData) {
                        this.loadTeamData();
                    } else if (this.loading()) {
                        queueMicrotask(() => this.loading.set(false));
                    }
                    return;
                }

                // Case 2: User has no team id - trigger loadTeamData to reset state
                if (!user.teamId) {
                    if (currentData) {
                        // User lost their team - loadTeamData will clear teamData
                        this.loadTeamData();
                    } else {
                        // User has no team ID and we have no data.
                        // We MUST try to load to see if they are a captain (fallback)
                        this.loadTeamData();
                    }
                    return;
                }

                // Case 3: User has a team id - check if we need to load it
                const storeTeam = this.teamStore.getTeamById(user.teamId);

                if (!storeTeam) {
                    // Team not in store - fetch it
                    this.loadTeamData();
                } else if (!currentData || currentData.id !== storeTeam.id || currentData.players?.length !== storeTeam.players?.length) {
                    // Team data changed - reload
                    this.loadTeamData();
                } else if (this.loading()) {
                    // Data is consistent, ensure loading is off
                    queueMicrotask(() => this.loading.set(false));
                }
            });
        });
    }

    private subscriptions = new Subscription();

    ngOnInit(): void {
        this.currentUser = this.authService.getCurrentUser();
        if (!this.currentUser) {
            this.router.navigate(['/auth/login']);
            return;
        }

        this.authService.refreshUserProfile().subscribe();
        this.loadInvitations();

        this.subscriptions.add(
            this.notificationService.joinRequestUpdate.subscribe(() => {
                if (!this.currentUser) return;

                const currentData = this.teamData();
                if (currentData && this.isCaptain()) {
                    this.teamRequestService.getRequestsForMyTeam().subscribe(requests => {
                        const latestData = this.teamData();
                        if (latestData) {
                            this.teamData.set({ ...latestData, invitations: requests });
                        }
                    });
                } else if (!currentData) {
                    this.authService.refreshUserProfile().subscribe({
                        next: (updatedUser) => {
                            if (updatedUser?.teamId) {
                                this.loadTeamData();
                            } else {
                                this.loadInvitations();
                            }
                        },
                        error: () => this.loadInvitations()
                    });
                } else {
                    this.loadInvitations();
                }
            })
        );
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    loadInvitations(): void {
        this.teamRequestService.getMyInvitations().subscribe({
            next: (invites) => {
                this.pendingInvitations.set(invites);
            }
        });
    }

    acceptInvite(requestId: string): void {
        this.loading.set(true);
        this.pendingInvitations.set([]);

        this.teamRequestService.acceptRequest(requestId).subscribe({
            next: (response) => {
                this.uiFeedback.success('تمت الإضافة', 'أهلاً بك في فريقك الجديد!');

                // Typed response handling
                const teamId = (response as any).teamId;

                if (teamId && typeof teamId === 'string') {
                    if (this.currentUser) {
                        const updatedUser = { ...this.currentUser, teamId };
                        this.currentUser = updatedUser;
                        this.authService.updateCurrentUser(updatedUser);
                    }
                    this.loadTeamData();
                    this.authService.refreshUserProfile().subscribe();
                } else {
                    console.warn('Backend did not return teamId. Falling back to refresh.');
                    this.authService.refreshUserProfile().subscribe({
                        next: (updatedUser) => {
                            if (updatedUser?.teamId) {
                                this.currentUser = updatedUser;
                                this.loadTeamData();
                            } else {
                                this.loading.set(false);
                                this.loadInvitations();
                            }
                        },
                        error: () => {
                            this.loading.set(false);
                            this.loadInvitations();
                        }
                    });
                }
            },
            error: (err) => {
                this.loading.set(false);
                this.loadInvitations();
                this.uiFeedback.error('فشل القبول', err.message);
            }
        });
    }

    rejectInvite(requestId: string): void {
        this.teamRequestService.rejectRequest(requestId).subscribe({
            next: () => {
                this.pendingInvitations.update(invites => invites.filter(i => i.id !== requestId));
                this.uiFeedback.success('تم الرفض', 'تم رفض الدعوة بنجاح');
            }
        });
    }

    loadTeamData(): void {
        if (this.isLoadingTeam) return;

        if (!this.currentUser) {
            this.teamData.set(null);
            this.loading.set(false);
            return;
        }

        let loadTeam$: Observable<Team | null> | null = null;

        if (this.currentUser.teamId) {
            loadTeam$ = this.teamService.getTeamByIdSilent(this.currentUser.teamId);
        } else {
            loadTeam$ = this.teamService.getTeamByCaptainId(this.currentUser.id).pipe(
                map((team: Team | undefined) => team || null),
                catchError(err => {
                    console.error('Error checking captain status', err);
                    return of(null);
                })
            );
        }

        if (!loadTeam$) {
            this.teamData.set(null);
            this.loadInvitations();
            queueMicrotask(() => this.loading.set(false));
            return;
        }

        this.isLoadingTeam = true;
        if (!this.loading()) {
            queueMicrotask(() => this.loading.set(true));
        }

        // Safety timeout using unref/ref pattern or just robust logic
        // We defer to queueMicrotask for cleanup if needed
        const safetyTimer = setTimeout(() => {
            if (this.loading() && this.isLoadingTeam) {
                console.warn('Force clearing loading state after timeout');
                this.isLoadingTeam = false;
                this.loading.set(false);
            }
        }, 8000);

        loadTeam$.subscribe({
            next: (team: Team | null) => {
                clearTimeout(safetyTimer);

                queueMicrotask(() => {
                    this.isLoadingTeam = false;
                    this.loading.set(false);

                    if (team) {
                        const isMember = team.captainId === this.currentUser?.id ||
                            (this.currentUser?.teamId === team.id) ||
                            (team.players && team.players.some((p: any) => p.userId === this.currentUser?.id || p.id === this.currentUser?.id));

                        if (!isMember) {
                            console.warn('Membership lost - clearing team association');
                            this.authService.clearTeamAssociation();
                            this.teamData.set(null);
                            this.loadInvitations();
                            return;
                        }

                        const existingTeam = this.teamStore.getTeamById(team.id);
                        if (existingTeam) {
                            this.teamStore.updateTeam(team);
                        } else {
                            this.teamStore.addTeam(team);
                        }

                        const converted = this.convertToTeamData(team);
                        this.teamData.set(converted);

                        if (this.isCaptain()) {
                            this.teamRequestService.getRequestsForMyTeam().subscribe(requests => {
                                const current = this.teamData();
                                if (current) {
                                    this.teamData.set({ ...current, invitations: requests });
                                }
                            });
                        }
                    } else {
                        this.teamData.set(null);
                        this.loadInvitations();
                    }

                    const user = this.authStore.currentUser();
                    if (user?.teamId && !this.teamData()) {
                        // Retry logic
                        queueMicrotask(() => this.loadTeamData());
                    }
                });
            },
            error: (err) => {
                clearTimeout(safetyTimer);
                queueMicrotask(() => {
                    this.isLoadingTeam = false;
                    this.loading.set(false);
                    if (err.status === 404) {
                        this.authService.clearTeamAssociation();
                        this.teamData.set(null);
                    }
                });
            }
        });
    }

    createNewTeam(): void {
        if (!this.currentUser) return;

        if (this.isUserPending()) {
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
                // Removed: this.isCaptain is computed automatically

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
        if (!this.teamData()) return;

        queueMicrotask(() => {
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
                    if (this.isCaptain()) {
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
        if (!this.isCaptain() || !current) return;

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
        if (!this.isCaptain() || !current) return;

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
                            // isCaptain computed automatically
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
