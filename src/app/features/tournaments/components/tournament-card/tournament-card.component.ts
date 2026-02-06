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
 * Enhanced with role-specific UI, contextual messages, and winner displays.
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
    @Input() showNonOwnerHint = false; // Show hint for non-captain players
    @Input() isClickable = true;
    @Input() isBusy = false; // Registered in another tournament

    @Output() viewDetails = new EventEmitter<Tournament>();
    @Output() register = new EventEmitter<Tournament>();

    TournamentStatus = TournamentStatus;
    RegistrationStatus = RegistrationStatus;

    get isUserPending(): boolean {
        return this.authService.getCurrentUser()?.status === 'Pending';
    }

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

    get badgeType(): 'success' | 'neutral' | 'warning' | 'danger' | 'info' | 'gold' {
        switch (this.tournament.status) {
            case TournamentStatus.REGISTRATION_OPEN:
                return 'success';
            case TournamentStatus.ACTIVE:
                return 'info';
            case TournamentStatus.COMPLETED:
                return this.tournament.winnerTeamId ? 'gold' : 'neutral';
            case TournamentStatus.CANCELLED:
                return 'danger';
            case TournamentStatus.REGISTRATION_CLOSED:
                return 'warning';
            default:
                return 'neutral';
        }
    }

    // Phase description for better UX
    getPhaseIcon(): string {
        switch (this.tournament.status) {
            case TournamentStatus.REGISTRATION_OPEN:
                return 'how_to_reg';
            case TournamentStatus.REGISTRATION_CLOSED:
                return 'lock';
            case TournamentStatus.ACTIVE:
                return 'sports_soccer';
            case TournamentStatus.COMPLETED:
                return 'emoji_events';
            case TournamentStatus.CANCELLED:
                return 'cancel';
            default:
                return 'info';
        }
    }

    getPhaseDescription(): string {
        switch (this.tournament.status) {
            case TournamentStatus.REGISTRATION_OPEN:
                return 'التسجيل متاح الآن';
            case TournamentStatus.REGISTRATION_CLOSED:
                return 'التسجيل مغلق - بانتظار البدء';
            case TournamentStatus.ACTIVE:
                return 'المباريات جارية';
            case TournamentStatus.COMPLETED:
                return 'انتهت البطولة';
            case TournamentStatus.CANCELLED:
                return 'البطولة ملغاة';
            default:
                return '';
        }
    }

    // Registration button dynamic states
    get isRegisterDisabled(): boolean {
        return this.isUserPending ||
            (this.isRegistered && this.myRegistration?.status !== RegistrationStatus.REJECTED) ||
            this.isBusy;
    }

    getRegisterButtonVariant(): 'primary' | 'outline' | 'danger' | 'gold' {
        if (this.myRegistration?.status === RegistrationStatus.REJECTED) {
            return 'danger';
        }
        if (this.isRegistered) {
            return 'gold'; // Use gold for registered/approved status
        }
        return 'outline';
    }

    getRegisterLabel(): string {
        if (this.isRegistered) {
            switch (this.myRegistration?.status) {
                case RegistrationStatus.APPROVED:
                    return 'مسجل ✓';
                case RegistrationStatus.PENDING_PAYMENT_REVIEW:
                    return 'قيد المراجعة';
                default:
                    return 'مسجل';
            }
        }
        if (this.myRegistration?.status === RegistrationStatus.REJECTED) {
            return 'تسجيل مجدداً';
        }
        return 'تسجيل الآن';
    }

    getRegisterIcon(): string | null {
        if (this.myRegistration?.status === RegistrationStatus.APPROVED) {
            return 'verified';
        }
        if (this.myRegistration?.status === RegistrationStatus.PENDING_PAYMENT_REVIEW) {
            return 'hourglass_top';
        }
        if (this.myRegistration?.status === RegistrationStatus.REJECTED) {
            return 'refresh';
        }
        return null;
    }

    getRegisterTooltip(): string {
        if (this.isUserPending) {
            return 'يجب تفعيل حسابك أولاً لتتمكن من التسجيل';
        }
        if (this.isBusy && !this.isRegistered) {
            return 'فريقك مسجل بالفعل في بطولة أخرى';
        }
        if (this.myRegistration?.status === RegistrationStatus.APPROVED) {
            return 'فريقك مسجل ومُوافَق عليه';
        }
        if (this.myRegistration?.status === RegistrationStatus.PENDING_PAYMENT_REVIEW) {
            return 'طلبك قيد المراجعة من الإدارة';
        }
        return '';
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
