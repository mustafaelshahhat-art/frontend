import { Component, ChangeDetectionStrategy, inject, Output, EventEmitter, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { TournamentDetailStore } from '../../stores/tournament-detail.store';
import { Permission } from '../../../../core/permissions/permissions.model';
import { TournamentStatus, TournamentFormat } from '../../../../core/models/tournament.model';

@Component({
    selector: 'app-tournament-actions',
    standalone: true,
    imports: [CommonModule, ButtonComponent, IconComponent, HasPermissionDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './tournament-actions.component.html',
    styleUrls: ['./tournament-actions.component.scss']
})
export class TournamentActionsComponent {
    readonly store = inject(TournamentDetailStore);

    Permission = Permission;
    TournamentStatus = TournamentStatus;

    @Input() isGeneratingMatches = false;

    @Output() editTournament = new EventEmitter<void>();
    @Output() deleteTournament = new EventEmitter<void>();
    @Output() toggleStatus = new EventEmitter<void>();
    @Output() generateMatches = new EventEmitter<void>();
    @Output() startTournament = new EventEmitter<void>();
    @Output() startManualDraw = new EventEmitter<void>();
    @Output() selectOpeningMatch = new EventEmitter<void>();
    @Output() resetSchedule = new EventEmitter<void>();
    @Output() emergencyStart = new EventEmitter<void>();
    @Output() emergencyEnd = new EventEmitter<void>();
    @Output() confirmQualification = new EventEmitter<void>();

    get tournament() { return this.store.tournament; }
    get tournamentMatches() { return this.store.tournamentMatches; }
    get canEditTournament() { return this.store.canEditTournament; }
    get canStartRegistration() { return this.store.canStartRegistration; }
    get canCloseRegistration() { return this.store.canCloseRegistration; }
    get canGenerateMatches() { return this.store.canGenerateMatches; }
    get canStartTournament() { return this.store.canStartTournament; }
    get canManageDraw() { return this.store.canManageDraw; }
    get canResetSchedule() { return this.store.canResetSchedule; }
    get canSelectOpeningMatch() { return this.store.canSelectOpeningMatch; }
    get canConfirmQualification() { return this.store.canConfirmQualification; }
    get canGenerateKnockoutR1() { return this.store.canGenerateKnockoutR1; }
    get hasKnockoutMatches() { return this.store.hasKnockoutMatches; }
    get hasGroupMatches() { return this.store.hasGroupMatches; }
    get canManageGroupDraw() { return this.store.canManageGroupDraw; }
    get canManageKnockoutDraw() { return this.store.canManageKnockoutDraw; }
    get isManualMode() { return this.store.isManualMode; }

    canGenerateSchedule = computed(() => false); // Replaced by automated flow
}
