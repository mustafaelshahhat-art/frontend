import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { TeamJoinRequest } from '../../../../core/models/team-request.model';

@Component({
    selector: 'app-join-requests-panel',
    standalone: true,
    imports: [CommonModule, IconComponent, ButtonComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './join-requests-panel.component.html',
    styleUrls: ['./join-requests-panel.component.scss']
})
export class JoinRequestsPanelComponent {
    /** Pending invitations for the current user (invite cards at top of page) */
    @Input() pendingInvitations: TeamJoinRequest[] = [];

    /** Join requests for captain's team (requests from players wanting to join) */
    @Input() teamJoinRequests: TeamJoinRequest[] = [];

    /** Display variant: 'invitations' for user invites, 'requests' for captain's queue */
    @Input() variant: 'invitations' | 'requests' = 'invitations';

    @Output() acceptRequest = new EventEmitter<string>();
    @Output() rejectRequest = new EventEmitter<string>();
    @Output() respondRequest = new EventEmitter<{ request: TeamJoinRequest; approve: boolean }>();

    onAccept(requestId: string): void {
        this.acceptRequest.emit(requestId);
    }

    onReject(requestId: string): void {
        this.rejectRequest.emit(requestId);
    }

    onRespond(request: TeamJoinRequest, approve: boolean): void {
        this.respondRequest.emit({ request, approve });
    }

    get items(): TeamJoinRequest[] {
        return this.variant === 'invitations' ? this.pendingInvitations : this.teamJoinRequests;
    }
}
