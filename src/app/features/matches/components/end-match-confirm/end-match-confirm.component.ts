import { Component, Input, Output, EventEmitter, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchService } from '../../../../core/services/match.service';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { Match } from '../../../../core/models/tournament.model';
import { firstValueFrom } from 'rxjs';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

@Component({
    selector: 'app-end-match-confirm',
    standalone: true,
    imports: [CommonModule, ModalComponent, ButtonComponent],
    templateUrl: './end-match-confirm.component.html',
    styleUrls: ['./end-match-confirm.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EndMatchConfirmComponent {
    private matchService = inject(MatchService);
    private uiFeedback = inject(UIFeedbackService);

    @Input() matchId = '';
    @Input() visible = false;

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() matchEnded = new EventEmitter<Match>();

    isSubmitting = false;

    async confirm(): Promise<void> {
        if (!this.matchId || this.isSubmitting) return;

        this.isSubmitting = true;
        try {
            const endedMatch = await firstValueFrom(this.matchService.endMatch(this.matchId));
            this.uiFeedback.success('تم بنجاح', 'تم إنهاء المباراة بنجاح');
            this.matchEnded.emit(endedMatch || undefined);
            this.close();
        } catch {
            this.uiFeedback.error('فشل إنهاء المباراة', 'تعذّر إنهاء المباراة. يرجى المحاولة مرة أخرى.');
        } finally {
            this.isSubmitting = false;
        }
    }

    cancel(): void {
        if (this.isSubmitting) return;
        this.close();
    }

    close(): void {
        this.visible = false;
        this.visibleChange.emit(false);
    }
}
