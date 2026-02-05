import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Tournament, TournamentStatus, RegistrationStatus } from '../../../../core/models/tournament.model';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { StatusLabelPipe } from '../../../../shared/pipes/status-label.pipe';
import { AuthService } from '../../../../core/services/auth.service';

/**
 * TournamentCardComponent - Displays a tournament in a premium card format.
 * 
 * Usage:
 *   <app-tournament-card 
 *       [tournament]="tournament" 
 *       [showRegisterButton]="true"
 *       (viewDetails)="onViewDetails($event)"
 *       (register)="onRegister($event)">
 *   </app-tournament-card>
 */
@Component({
    selector: 'app-tournament-card',
    standalone: true,
    imports: [
        CommonModule,
        CardComponent,
        BadgeComponent,
        ButtonComponent,
        StatusLabelPipe
    ],
    templateUrl: './tournament-card.component.html',
    styleUrls: ['./tournament-card.component.scss']
})
export class TournamentCardComponent {
    private readonly authService = inject(AuthService);

    @Input({ required: true }) tournament!: Tournament;
    @Input() showRegisterButton = false;
    @Input() isClickable = true;
    @Input() isBusy = false; // Registered in another tournament

    @Output() viewDetails = new EventEmitter<Tournament>();
    @Output() register = new EventEmitter<Tournament>();

    TournamentStatus = TournamentStatus;

    get isUserPending(): boolean {
        return this.authService.getCurrentUser()?.status === 'Pending';
    }

    RegistrationStatus = RegistrationStatus;

    get myRegistration() {
        const teamId = this.authService.getCurrentUser()?.teamId;
        return this.tournament.registrations?.find(r => r.teamId === teamId);
    }

    get isRegistered(): boolean {
        return !!this.myRegistration && this.myRegistration.status !== RegistrationStatus.REJECTED;
    }

    get progressPercent(): number {
        if (!this.tournament.maxTeams) return 0;
        return (this.tournament.currentTeams / this.tournament.maxTeams) * 100;
    }

    get badgeType(): 'success' | 'neutral' | 'warning' | 'danger' | 'info' {
        switch (this.tournament.status) {
            case TournamentStatus.REGISTRATION_OPEN:
                return 'success';
            case TournamentStatus.ACTIVE:
                return 'info';
            case TournamentStatus.COMPLETED:
                return 'neutral';
            case TournamentStatus.CANCELLED:
                return 'danger';
            case TournamentStatus.REGISTRATION_CLOSED:
                return 'warning';
            default:
                return 'neutral';
        }
    }

    onCardClick(): void {
        this.viewDetails.emit(this.tournament);
    }

    onViewDetailsClick(event: Event): void {
        event.stopPropagation();
        this.viewDetails.emit(this.tournament);
    }

    onRegisterClick(event: Event): void {
        event.stopPropagation();
        this.register.emit(this.tournament);
    }
}
