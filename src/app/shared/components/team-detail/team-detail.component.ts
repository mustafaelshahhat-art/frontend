import { Component, Input, Output, EventEmitter, inject, OnChanges, SimpleChanges } from '@angular/core';
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
    PlayerStatus,
    BadgeVariant
} from '../../utils/status-labels';

export interface TeamPlayer {
    id: string; // Changed to string (Guid)
    name: string;
    number: number;
    position: string;
    goals: number;
    yellowCards: number;
    redCards: number;
    status: string;
}

export interface TeamMatch {
    id: string;
    opponent: string;
    date: Date;
    score?: string;
    status: string;
    type: string;
    opponentLogo?: string;
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
    captainId: string;
    city: string;
    captainName: string;
    logo: string;
    status: 'READY' | 'NOT_READY' | string;
    playerCount?: number;
    maxPlayers?: number;
    isActive: boolean;
    createdAt: Date;
    stats: TeamStats;
    players: TeamPlayer[];
    matches: TeamMatch[];
    finances: TeamFinance[];
    invitations?: any[];
}

@Component({
    selector: 'app-team-detail',
    standalone: true,
    imports: [
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
    styleUrls: ['./team-detail.component.scss']
})
export class TeamDetailComponent implements OnChanges {
    private readonly router = inject(Router);
    private readonly uiFeedback = inject(UIFeedbackService);

    @Input() team!: TeamData;
    @Input() showBackButton: boolean = false;
    @Input() backRoute: string = '/admin/teams';
    @Input() initialTab: 'overview' | 'players' | 'matches' | 'finances' = 'overview';

    // Permissions
    @Input() canEditName: boolean = false;
    @Input() canAddPlayers: boolean = false;
    @Input() canRemovePlayers: boolean = false;
    @Input() canManageStatus: boolean = false; // للأدمن فقط (تفعيل/تعليق/حظر)
    @Input() canDeleteTeam: boolean = false; // للكابتن
    @Input() canManageInvitations: boolean = false; // للكابتن
    @Input() isInviteLoading: boolean = false; // حالة تحميل الدعوة

    @Output() playerAction = new EventEmitter<{ player: TeamPlayer, action: 'activate' | 'deactivate' | 'ban' | 'remove' }>();
    @Output() tabChanged = new EventEmitter<string>();
    @Output() backClicked = new EventEmitter<void>();
    @Output() editName = new EventEmitter<string>();
    @Output() addPlayer = new EventEmitter<string>();
    @Output() deleteTeam = new EventEmitter<void>();
    @Output() disableTeam = new EventEmitter<void>();
    @Output() respondRequest = new EventEmitter<{ request: any, approve: boolean }>();

    @Input() canSeeRequests: boolean = false;
    @Input() canSeeFinances: boolean = false;

    activeTab = 'overview';
    isEditingName = false;
    tempName = '';
    filteredTabs: any[] = [];

    onRespondRequest(request: any, approve: boolean): void {
        this.respondRequest.emit({ request, approve });
    }

    private updateFilteredTabs(): void {
        this.filteredTabs = this.tabs.filter(tab => {
            if (tab.value === 'requests') return this.canSeeRequests;
            if (tab.value === 'finances') return this.canSeeFinances;
            return true;
        });
    }

    tabs = [
        { value: 'overview', label: 'نظرة عامة', icon: 'dashboard' },
        { value: 'players', label: 'قائمة اللاعبين', icon: 'groups' },
        { value: 'matches', label: 'المباريات', icon: 'sports_soccer' },
        { value: 'requests', label: 'طلبات الانضمام', icon: 'mail' },
        { value: 'finances', label: 'المالية', icon: 'payments' }
    ];

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['canSeeRequests'] || changes['canSeeFinances']) {
            this.updateFilteredTabs();
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
    displayIdControl = new FormControl('', [Validators.required]);

    onAddPlayerClick(): void {
        this.isInviteModalOpen = true;
        this.displayIdControl.reset();
    }

    closeInviteModal(): void {
        this.isInviteModalOpen = false;
        this.displayIdControl.reset();
    }

    submitAddPlayer(): void {
        if (this.displayIdControl.invalid) {
            this.uiFeedback.warning('تنبيه', 'يرجى إدخال الرقم التعريفي للاعب');
            return;
        }

        const playerId = this.displayIdControl.value || '';
        this.addPlayer.emit(playerId);
    }

    navigateBack(): void {
        if (this.backClicked.observers.length > 0) {
            this.backClicked.emit();
        } else {
            this.router.navigate([this.backRoute]);
        }
    }

    onTabChange(tab: string): void {
        this.activeTab = tab;
        this.tabChanged.emit(tab);
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
}
