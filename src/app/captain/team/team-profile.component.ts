import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TeamService } from '../../core/services/team.service';
import { AuthService } from '../../core/services/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { Team, Player, JoinRequest, MAX_TEAM_PLAYERS } from '../../core/models/team.model';
import { User, UserRole } from '../../core/models/user.model';
import { UIFeedbackService } from '../../shared/services/ui-feedback.service';


@Component({
    selector: 'app-team-profile',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent],
    templateUrl: './team-profile.component.html',
    styleUrls: ['./team-profile.component.scss']
})
export class TeamProfileComponent implements OnInit {
    @ViewChild('logoInput') logoInput!: ElementRef<HTMLInputElement>;

    private cdr = inject(ChangeDetectorRef);
    private router = inject(Router);
    private teamService = inject(TeamService);
    private authService = inject(AuthService);
    private uiFeedback = inject(UIFeedbackService);

    currentUser: User | null = null;
    team: Team | null = null;
    players: Player[] = [];
    joinRequests: JoinRequest[] = [];

    isEditingTeam = false;
    editedTeamName = '';

    // Team Logo
    teamLogoUrl: string | null = null;

    // Create Team Modal State
    showCreateTeamModal = false;
    newTeamName = '';
    isCreatingTeam = false;

    // Add Player Modal State
    showAddPlayerModal = false;
    searchPlayerId = '';
    isAddingPlayer = false;

    // Custom Confirm Modal State
    showConfirmModal = false;
    confirmTitle = '';
    confirmMessage = '';
    confirmAction: (() => void) | null = null;
    isConfirmLoading = false;
    confirmType: 'team' | 'player' = 'team';

    // Delete team state
    isDeletingTeam = false;

    // Max players constant
    maxPlayers = MAX_TEAM_PLAYERS;

    // Check if user is a captain (has a team they own)
    get isCaptain(): boolean {
        return this.currentUser?.role === UserRole.CAPTAIN && !!this.team;
    }

    // Check if user is a player in a team (but not captain)
    get isPlayerInTeam(): boolean {
        return this.currentUser?.role === UserRole.PLAYER && !!this.currentUser?.teamId;
    }

    // Check if user has no team
    get hasNoTeam(): boolean {
        return !this.currentUser?.teamId && this.currentUser?.role !== UserRole.CAPTAIN;
    }

    // Check if team is full
    get isTeamFull(): boolean {
        // Captain counts as 1, plus all players
        return this.team ? (this.players.length + 1) >= MAX_TEAM_PLAYERS : false;
    }

    ngOnInit(): void {
        this.currentUser = this.authService.getCurrentUser();
        if (!this.currentUser) return;

        if (this.currentUser.role === UserRole.CAPTAIN) {
            // Captain - load their team
            this.teamService.getTeamByCaptainId(this.currentUser.id).subscribe(team => {
                if (team) {
                    this.team = team;
                    this.players = team.players;
                    this.joinRequests = team.joinRequests.filter(jr => jr.status === 'pending');
                    this.editedTeamName = team.name;
                }
            });
        } else if (this.currentUser.teamId) {
            // Player in a team - load team info (view only)
            this.teamService.getTeamById(this.currentUser.teamId).subscribe(team => {
                if (team) {
                    this.team = team;
                    this.players = team.players;
                }
            });
        }
    }

    // ==================== CUSTOM CONFIRM MODAL ====================
    openConfirmModal(title: string, message: string, action: () => void, type: 'team' | 'player' = 'team'): void {
        this.confirmTitle = title;
        this.confirmMessage = message;
        this.confirmAction = action;
        this.confirmType = type;
        this.showConfirmModal = true;
    }

    closeConfirmModal(): void {
        this.showConfirmModal = false;
        this.confirmAction = null;
        this.isConfirmLoading = false;
    }

    executeConfirmAction(): void {
        if (this.confirmAction) {
            this.isConfirmLoading = true;
            this.confirmAction();
        }
    }

    // ==================== TEAM LOGO ====================
    triggerLogoUpload(): void {
        this.logoInput.nativeElement.click();
    }

    onLogoSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            const file = input.files[0];
            if (file.size > 2 * 1024 * 1024) {
                this.uiFeedback.error('خطأ', 'حجم الصورة يجب أن يكون أقل من 2 ميجابايت');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                this.teamLogoUrl = e.target?.result as string;
                this.uiFeedback.success('تم التحديث', 'تم تحديث شعار الفريق');
                this.cdr.detectChanges();
            };
            reader.readAsDataURL(file);
        }
    }

    // ==================== CREATE TEAM ====================
    toggleCreateTeamModal(): void {
        this.showCreateTeamModal = !this.showCreateTeamModal;
        this.newTeamName = '';
    }

    createTeam(): void {
        if (!this.newTeamName.trim()) {
            this.uiFeedback.error('خطأ', 'يرجى إدخال اسم الفريق');
            return;
        }

        if (!this.currentUser) return;

        this.isCreatingTeam = true;
        this.teamService.createTeam(this.currentUser, this.newTeamName.trim()).subscribe({
            next: (result) => {
                this.team = result.team;
                this.currentUser = result.updatedUser;
                this.players = [];
                this.joinRequests = [];
                this.editedTeamName = result.team.name;
                this.showCreateTeamModal = false;
                this.isCreatingTeam = false;
                this.uiFeedback.success('تم بنجاح', 'تم إنشاء الفريق بنجاح! أنت الآن قائد الفريق');
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.uiFeedback.error('خطأ', err.message);
                this.isCreatingTeam = false;
            }
        });
    }

    // ==================== DELETE TEAM ====================
    confirmDeleteTeam(): void {
        this.openConfirmModal(
            'حذف الفريق نهائياً',
            'سيتم حذف الفريق وإزالة جميع اللاعبين. هذا الإجراء لا يمكن التراجع عنه!',
            () => this.deleteTeam(),
            'team'
        );
    }

    deleteTeam(): void {
        if (!this.team || !this.currentUser) return;

        this.teamService.deleteTeam(this.team.id, this.currentUser).subscribe({
            next: (updatedUser) => {
                this.currentUser = updatedUser;
                this.team = null;
                this.players = [];
                this.joinRequests = [];
                this.closeConfirmModal();
                this.uiFeedback.success('تم الحذف', 'تم حذف الفريق. أنت الآن لاعب عادي ويمكنك الانضمام لفريق آخر أو إنشاء فريق جديد.');
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.uiFeedback.error('خطأ', err.message);
                this.isConfirmLoading = false;
            }
        });
    }

    // ==================== ADD PLAYER BY ID ====================
    toggleAddPlayerModal(): void {
        this.showAddPlayerModal = !this.showAddPlayerModal;
        this.searchPlayerId = '';
    }

    addPlayerById(): void {
        if (!this.searchPlayerId.trim()) {
            this.uiFeedback.error('خطأ', 'يرجى إدخال ID اللاعب');
            return;
        }

        if (!this.team || !this.currentUser) return;

        this.isAddingPlayer = true;
        this.teamService.addPlayerByDisplayId(this.team.id, this.searchPlayerId.trim(), this.currentUser).subscribe({
            next: (player) => {
                this.uiFeedback.success('تم الإضافة', `تم إضافة اللاعب ${player.name} بنجاح`);
                this.showAddPlayerModal = false;
                this.isAddingPlayer = false;
                this.players = [...this.team!.players];
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.uiFeedback.error('خطأ', err.message);
                this.isAddingPlayer = false;
            }
        });
    }

    // ==================== JOIN REQUESTS ====================
    approveJoinRequest(requestId: string): void {
        if (!this.team || !this.currentUser) return;

        this.teamService.respondToJoinRequest(this.team.id, requestId, true, this.currentUser).subscribe({
            next: (result) => {
                this.joinRequests = this.joinRequests.filter(jr => jr.id !== requestId);
                if (result.player) {
                    this.players = [...this.team!.players];
                }
                this.uiFeedback.success('تمت الموافقة', `تمت الموافقة على طلب الانضمام`);
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.uiFeedback.error('خطأ', err.message);
            }
        });
    }

    rejectJoinRequest(requestId: string): void {
        if (!this.team || !this.currentUser) return;

        this.teamService.respondToJoinRequest(this.team.id, requestId, false, this.currentUser).subscribe({
            next: () => {
                this.joinRequests = this.joinRequests.filter(jr => jr.id !== requestId);
                this.uiFeedback.success('تم الرفض', 'تم رفض طلب الانضمام');
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.uiFeedback.error('خطأ', err.message);
            }
        });
    }

    // ==================== REMOVE PLAYER ====================
    confirmRemovePlayer(player: Player): void {
        this.openConfirmModal(
            'استبعاد اللاعب',
            `سيتم إزالة "${player.name}" من صفوف الفريق`,
            () => this.removePlayer(player.id),
            'player'
        );
    }

    removePlayer(id: string): void {
        if (!this.team) return;

        this.teamService.removePlayer(this.team.id, id).subscribe(() => {
            this.players = this.players.filter(p => p.id !== id);
            this.closeConfirmModal();
            this.uiFeedback.success('تم الحذف', 'تم حذف اللاعب من الفريق');
            this.cdr.detectChanges();
        });
    }

    // ==================== UPDATE TEAM ====================
    saveTeam(): void {
        if (!this.team) return;

        this.teamService.updateTeam({ ...this.team, name: this.editedTeamName }).subscribe(updated => {
            this.team = updated;
            this.isEditingTeam = false;
            this.uiFeedback.success('تم التحديث', 'تم تحديث اسم الفريق');
            this.cdr.detectChanges();
        });
    }
}
