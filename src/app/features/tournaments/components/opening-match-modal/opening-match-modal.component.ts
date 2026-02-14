import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tournament, RegistrationStatus } from '../../../../core/models/tournament.model';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';

@Component({
    selector: 'app-opening-match-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, IconComponent, ButtonComponent, BadgeComponent],
    templateUrl: './opening-match-modal.component.html',
    styleUrls: ['./opening-match-modal.component.scss']
})
export class OpeningMatchModalComponent implements OnChanges {
    @Input() tournament!: Tournament;
    @Input() isVisible = false;
    @Output() close = new EventEmitter<void>();
    @Output() submit = new EventEmitter<{ homeTeamId: string, awayTeamId: string }>();

    // Selected teams
    teamAId: string | null = null;
    teamBId: string | null = null;
    errorMessage: string | null = null;

    availableTeams: any[] = [];

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['tournament'] && this.tournament) {
            this.availableTeams = (this.tournament.registrations || [])
                .filter(r => r.status === RegistrationStatus.APPROVED)
                .sort((a, b) => a.teamName.localeCompare(b.teamName));
        }

        // Reset logic when modal opens
        if (changes['isVisible'] && this.isVisible && this.tournament) {
            this.teamAId = this.tournament.openingTeamAId || this.tournament.openingMatchHomeTeamId || null;
            this.teamBId = this.tournament.openingTeamBId || this.tournament.openingMatchAwayTeamId || null;
            this.errorMessage = null;
        }
    }

    canSubmit(): boolean {
        if (!this.teamAId || !this.teamBId) return false;
        if (this.teamAId === this.teamBId) return false;
        return true;
    }

    onSubmit() {
        this.errorMessage = null;

        if (!this.teamAId || !this.teamBId) {
            this.errorMessage = 'يرجى اختيار الفريقين';
            return;
        }

        if (this.teamAId === this.teamBId) {
            this.errorMessage = 'يرجى اختيار فريقين مختلفين';
            return;
        }

        this.submit.emit({
            homeTeamId: this.teamAId,
            awayTeamId: this.teamBId
        });
    }
}
