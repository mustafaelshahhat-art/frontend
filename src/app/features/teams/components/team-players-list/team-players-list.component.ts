import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { TeamPlayer } from '../../../../shared/components/team-detail';

@Component({
    selector: 'app-team-players-list',
    standalone: true,
    imports: [CommonModule, FormsModule, IconComponent, ButtonComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './team-players-list.component.html',
    styleUrls: ['./team-players-list.component.scss']
})
export class TeamPlayersListComponent {
    @Input({ required: true }) players: TeamPlayer[] = [];
    @Input() isCaptain = false;
    @Input() isAddingPlayer = false;

    @Output() invitePlayer = new EventEmitter<string>();
    @Output() playerAction = new EventEmitter<{ player: TeamPlayer; action: 'activate' | 'deactivate' | 'ban' | 'remove' }>();

    invitePlayerId = '';

    onInvite(): void {
        if (this.invitePlayerId.trim()) {
            this.invitePlayer.emit(this.invitePlayerId.trim());
            this.invitePlayerId = '';
        }
    }

    onPlayerAction(player: TeamPlayer, action: 'activate' | 'deactivate' | 'ban' | 'remove'): void {
        this.playerAction.emit({ player, action });
    }
}
