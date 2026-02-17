import { IconComponent } from '../icon/icon.component';
import { Component, Input, Output, EventEmitter, inject, OnChanges, SimpleChanges, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UIFeedbackService } from '../../services/ui-feedback.service';
import { FilterComponent } from '../filter/filter.component';
import { ButtonComponent } from '../button/button.component';
import { BadgeComponent } from '../badge/badge.component';
import { SmartImageComponent } from '../smart-image/smart-image.component';
import { FormControlComponent } from '../form-control/form-control.component';
import { ModalComponent } from '../modal/modal.component';
import {
    getPlayerStatus,
    BadgeVariant
} from '../../utils/status-labels';
import { TeamJoinRequest } from '../../../core/models/team-request.model';

export interface TeamPlayer {
    id: string; // Changed to string (Guid)
    name: string;
    number: number;
    position: string;
    goals: number;
    yellowCards: number;
    redCards: number;
    status: string;
    teamRole?: 'Captain' | 'Member';
}

export interface TeamMatch {
    id: string;
    opponent: string;
    date: Date;
    score?: string;
    status: string;
    type: string;
    teamScore?: number;
    opponentScore?: number;
}

export interface TeamFinance {
    id: string;
    title: string;
    category: string;
    amount: number;
    date: Date;
    status: string;
    type: string;
}

export interface TeamStats {
    matches: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    rank: number;
}

export interface TeamData {
    id: string;
    name: string;
    city: string;
    captainName: string;
    status: 'READY' | 'NOT_READY' | string;
    playerCount?: number;
    maxPlayers?: number;
    isActive: boolean;
    createdAt: Date;
    stats: TeamStats;
    players: TeamPlayer[];
    matches: TeamMatch[];
    finances: TeamFinance[];
    invitations?: TeamJoinRequest[];
}

@Component({
    selector: 'app-team-detail',
    standalone: true,
    imports: [IconComponent,
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        FilterComponent,
        ButtonComponent,
        BadgeComponent,
        SmartImageComponent,
        FormControlComponent,
        ModalComponent
    ],
    templateUrl: './team-detail.component.html',
    styleUrls: ['./team-detail.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeamDetailComponent implements OnChanges, OnInit {
    private readonly router = inject(Router);
    private readonly uiFeedback = inject(UIFeedbackService);

    @Input() team!: TeamData;
    @Input() showBackButton = false;
    @Input() backRoute = '/admin/teams';
    @Input() initialTab: 'overview' | 'players' | 'matches' | 'finances' = 'overview';

    // Permissions
    @Input() canEditName = false;
    @Input() canAddPlayers = false;
    @Input() canRemovePlayers = false;
    @Input() canManageStatus = false; // للأدمن فقط (تفعيل/تعليق/حظر)
    @Input() canDeleteTeam = false; // للكابتن
    @Input() canManageInvitations = false; // للكابتن
    @Input() isInviteLoading = false; // حالة تحميل الدعوة

    @Output() playerAction = new EventEmitter<{ player: TeamPlayer, action: 'activate' | 'deactivate' | 'ban' | 'remove' }>();
    @Output() tabChanged = new EventEmitter<string>();
    @Output() backClicked = new EventEmitter<void>();
    @Output() editName = new EventEmitter<string>();
    @Output() addPlayer = new EventEmitter<string>();
    @Output() addGuestPlayer = new EventEmitter<{ name: string, number?: number, position?: string }>();
    @Output() deleteTeam = new EventEmitter<void>();
    @Output() disableTeam = new EventEmitter<void>();
    @Output() activateTeam = new EventEmitter<void>();
    @Output() respondRequest = new EventEmitter<{ request: TeamJoinRequest, approve: boolean }>();

    @Input() canSeeRequests = false;
    @Input() canSeeFinances = false;

    activeTab = 'overview';
    isEditingName = false;
    tempName = '';
    filteredTabs: { value: string, label: string, icon: string }[] = [];

    onRespondRequest(request: TeamJoinRequest, approve: boolean): void {
        this.respondRequest.emit({ request, approve });
    }

    private updateFilteredTabs(): void {
        this.filteredTabs = this.tabs.filter(tab => {
            if (tab.value === 'finances') return this.canSeeFinances;
            return true;
        });
    }

    tabs = [
        { value: 'overview', label: 'نظرة عامة', icon: 'dashboard' },
        { value: 'players', label: 'قائمة اللاعبين', icon: 'groups' },
        { value: 'matches', label: 'المباريات', icon: 'sports_soccer' },
        { value: 'finances', label: 'المالية', icon: 'payments' }
    ];

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['canSeeFinances']) {
            this.updateFilteredTabs();
        }

        // Auto-close invite modal when loading finishes (request completed)
        if (changes['isInviteLoading'] && !changes['isInviteLoading'].firstChange) {
            const wasLoading = changes['isInviteLoading'].previousValue;
            const isNowLoading = changes['isInviteLoading'].currentValue;
            if (wasLoading && !isNowLoading && this.isInviteModalOpen) {
                this.closeInviteModal();
            }
        }
    }

    ngOnInit(): void {
        this.activeTab = this.initialTab;
        this.tempName = this.team?.name || '';
        this.updateFilteredTabs();
    }

    startEditName(): void {
        if (!this.canEditName) return;
        this.isEditingName = true;
        this.tempName = this.team.name;
    }

    saveName(): void {
        this.isEditingName = false;
        if (this.tempName.trim() && this.tempName !== this.team.name) {
            this.editName.emit(this.tempName);
        }
    }

    cancelEdit(): void {
        this.isEditingName = false;
    }

    // Modal State
    isInviteModalOpen = false;
    playerMode: 'registered' | 'guest' = 'registered';
    displayIdControl = new FormControl('', [Validators.required]);
    guestNameControl = new FormControl('', [Validators.required, Validators.minLength(2)]);


    playerModes = [
        { value: 'registered', label: 'لاعب مسجّل', icon: 'person_search' },
        { value: 'guest', label: 'لاعب غير مسجّل', icon: 'person_add' }
    ];

    onAddPlayerClick(): void {
        this.isInviteModalOpen = true;
        this.playerMode = 'registered';
        this.displayIdControl.reset();
        this.guestNameControl.reset();

    }

    closeInviteModal(): void {
        this.isInviteModalOpen = false;
        this.displayIdControl.reset();
        this.guestNameControl.reset();

    }

    onPlayerModeChange(mode: unknown): void {
        this.playerMode = mode as 'registered' | 'guest';
    }

    submitAddPlayer(): void {
        if (this.playerMode === 'registered') {
            if (this.displayIdControl.invalid) {
                this.uiFeedback.warning('تنبيه', 'يرجى إدخال الرقم التعريفي للاعب');
                return;
            }
            const playerId = this.displayIdControl.value || '';
            this.addPlayer.emit(playerId);
        } else {
            if (this.guestNameControl.invalid) {
                this.uiFeedback.warning('تنبيه', 'يرجى إدخال اسم اللاعب (على الأقل حرفين)');
                return;
            }
            this.addGuestPlayer.emit({
                name: this.guestNameControl.value || ''
            });
        }
    }

    navigateBack(): void {
        if (this.backClicked.observers.length > 0) {
            this.backClicked.emit();
        } else {
            this.router.navigate([this.backRoute]);
        }
    }

    onTabChange(tab: unknown): void {
        const t = tab as 'overview' | 'players' | 'matches' | 'finances' | 'requests';
        this.activeTab = t;
        this.tabChanged.emit(t);
    }

    getPlayerStatusBadgeType(status: string): BadgeVariant {
        const statusConfig = getPlayerStatus(status);
        return statusConfig.variant;
    }

    getPlayerStatusLabel(status: string): string {
        const statusConfig = getPlayerStatus(status);
        return statusConfig.label;
    }

    getMatchResultClass(status: string): string {
        return `match-result ${status}`;
    }

    requestPlayerAction(player: TeamPlayer, action: 'activate' | 'deactivate' | 'ban' | 'remove'): void {
        const canManage = (action === 'remove') ? this.canRemovePlayers : this.canManageStatus;

        if (!canManage) {
            return;
        }

        this.playerAction.emit({ player, action });
    }

    onDeleteTeamClick(): void {
        this.deleteTeam.emit();
    }

    onDisableTeamClick(): void {
        this.disableTeam.emit();
    }

    onActivateTeamClick(): void {
        this.activateTeam.emit();
    }
}
