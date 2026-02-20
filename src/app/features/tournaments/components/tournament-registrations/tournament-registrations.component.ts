import { Component, ChangeDetectionStrategy, inject, Output, EventEmitter, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { TournamentDetailStore } from '../../stores/tournament-detail.store';
import { Permission } from '../../../../core/permissions/permissions.model';
import { TournamentStatus, RegistrationStatus } from '../../../../core/models/tournament.model';
import { AuthService } from '../../../../core/services/auth.service';
import { UserStatus } from '../../../../core/models/user.model';
import { getRegStatusLabel as _regStatusLabel } from '../../utils/tournament-status.utils';

@Component({
    selector: 'app-tournament-registrations',
    standalone: true,
    imports: [CommonModule, ButtonComponent, IconComponent, HasPermissionDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './tournament-registrations.component.html',
    styleUrls: ['./tournament-registrations.component.scss']
})
export class TournamentRegistrationsComponent {
    readonly store = inject(TournamentDetailStore);
    private readonly authService = inject(AuthService);

    Permission = Permission;
    TournamentStatus = TournamentStatus;
    RegistrationStatus = RegistrationStatus;

    @Output() registerTeam = new EventEmitter<void>();
    @Output() withdrawTeam = new EventEmitter<void>();

    get tournament() { return this.store.tournament; }
    get myRegistration() { return this.store.myRegistration; }
    get isRegistered() { return this.store.isRegistered; }
    get isCaptain() { return this.store.isCaptain; }

    isUserPending = computed(() => this.authService.getCurrentUser()?.status === UserStatus.PENDING);

    getRegStatusLabel(status: string): string {
        return _regStatusLabel(status);
    }
}
