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

        // If parent component is listening, emit the event
        if (this.playerAction.observers.length > 0) {
            this.playerAction.emit({ player, action });
            return;
        }

        // Otherwise, handle locally with confirmation dialog
        const config = {
            activate: { title: 'تفعيل اللاعب', message: `هل أنت متأكد من تفعيل اللاعب "${player.name}"؟ سيتمكن من المشاركة في المباريات القادمة.`, btn: 'تفعيل الآن', type: 'info' as const },
            deactivate: { title: 'تعطيل اللاعب', message: `هل أنت متأكد من تعطيل اللاعب "${player.name}"؟ لن يتمكن من المشاركة في المباريات حتى يتم إعادة تفعيله.`, btn: 'تعطيل اللاعب', type: 'danger' as const },
            ban: { title: 'حظر اللاعب نهائياً', message: `هل أنت متأكد من حظر اللاعب "${player.name}"؟ هذا الإجراء سيمنع اللاعب من المشاركة في البطولة نهائياً.`, btn: 'حظر نهائي', type: 'danger' as const },
            remove: { title: 'حذف اللاعب من الفريق', message: `هل أنت متأكد من حذف اللاعب "${player.name}" من الفريق؟`, btn: 'حذف من الفريق', type: 'danger' as const }
        };

        const { title, message, btn, type } = config[action];

        this.uiFeedback.confirm(title, message, btn, type).subscribe((confirmed: boolean) => {
            if (confirmed) {
                if (action === 'activate') player.status = 'active';
                else if (action === 'deactivate') player.status = 'suspended';
                else if (action === 'ban') player.status = 'banned';
                else if (action === 'remove') {
                    this.team.players = this.team.players.filter(p => p.id !== player.id);
                }

                this.uiFeedback.success('تم التحديث', 'تم تنفيذ العملية بنجاح');
            }
        });
    }

    onDeleteTeamClick(): void {
        this.uiFeedback.confirm(
            'حذف الفريق',
            'هل أنت متأكد من حذف هذا الفريق؟ سيتم أرشفة الفريق ولكن ستبقى نتائج المباريات محفوظة.',
            'حذف نهائي',
            'danger'
        ).subscribe(confirmed => {
            if (confirmed) {
                this.deleteTeam.emit();
            }
        });
    }

    onDisableTeamClick(): void {
        this.uiFeedback.confirm(
            'تعطيل الفريق',
            'هل أنت متأكد من تعطيل هذا الفريق؟ سيؤدي ذلك إلى انسحابه من أي بطولة جارية واعتبار مبارياته القادمة خاسرة (0-3). لا يمكن التراجع عن هذا الإجراء بسهولة.',
            'تأكيد التعطيل',
            'danger'
        ).subscribe(confirmed => {
            if (confirmed) {
                this.disableTeam.emit();
            }
        });
    }
}
