import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UIFeedbackService } from '../../services/ui-feedback.service';
import { FilterComponent } from '../filter/filter.component';
import { ButtonComponent } from '../button/button.component';
import { BadgeComponent } from '../badge/badge.component';

export interface TeamPlayer {
    id: number;
    name: string;
    number: number;
    position: string;
    goals: number;
    yellowCards: number;
    redCards: number;
    status: 'active' | 'suspended' | 'banned';
}

export interface TeamMatch {
    id: number;
    opponent: string;
    date: Date;
    score: string;
    status: 'win' | 'draw' | 'loss';
    type: string;
}

export interface TeamFinance {
    id: number;
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
    logo: string;
    status: 'READY' | 'NOT_READY';
    isActive: boolean;
    createdAt: Date;
    stats: TeamStats;
    players: TeamPlayer[];
    matches: TeamMatch[];
    finances: TeamFinance[];
}

@Component({
    selector: 'app-team-detail',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        FilterComponent,
        ButtonComponent,
        BadgeComponent
    ],
    templateUrl: './team-detail.component.html',
    styleUrls: ['./team-detail.component.scss']
})
export class TeamDetailComponent {
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

    @Output() playerAction = new EventEmitter<{ player: TeamPlayer, action: 'activate' | 'deactivate' | 'ban' | 'remove' }>();
    @Output() tabChanged = new EventEmitter<string>();
    @Output() backClicked = new EventEmitter<void>();
    @Output() editName = new EventEmitter<string>();
    @Output() addPlayer = new EventEmitter<string>();

    activeTab = 'overview';
    isEditingName = false;
    tempName = '';

    tabs = [
        { value: 'overview', label: 'نظرة عامة', icon: 'dashboard' },
        { value: 'players', label: 'قائمة اللاعبين', icon: 'groups' },
        { value: 'matches', label: 'المباريات', icon: 'sports_soccer' },
        { value: 'finances', label: 'المالية', icon: 'payments' }
    ];

    ngOnInit(): void {
        this.activeTab = this.initialTab;
        this.tempName = this.team?.name || '';
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

    showAddPlayerModal = false;
    playerSearchId = '';
    isSearching = false;

    onAddPlayerClick(): void {
        this.showAddPlayerModal = true;
        this.playerSearchId = '';
    }

    closeAddPlayerModal(): void {
        this.showAddPlayerModal = false;
        this.playerSearchId = '';
    }

    submitAddPlayer(): void {
        if (!this.playerSearchId.trim()) {
            this.uiFeedback.warning('تنبيه', 'يرجى إدخال الرقم التعريفي للاعب');
            return;
        }

        this.addPlayer.emit(this.playerSearchId);
        this.showAddPlayerModal = false;
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

    getPlayerStatusBadgeType(status: string): 'success' | 'warning' | 'danger' {
        switch (status) {
            case 'active': return 'success';
            case 'suspended': return 'warning';
            case 'banned': return 'danger';
            default: return 'success';
        }
    }

    getPlayerStatusLabel(status: string): string {
        switch (status) {
            case 'active': return 'نشط';
            case 'suspended': return 'موقوف';
            case 'banned': return 'محظور';
            default: return 'نشط';
        }
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
}
