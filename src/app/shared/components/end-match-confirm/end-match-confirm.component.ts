import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchService } from '../../../core/services/match.service';
import { UIFeedbackService } from '../../services/ui-feedback.service';
import { Match } from '../../../core/models/tournament.model';
import { ModalComponent } from '../modal/modal.component';
import { ButtonComponent } from '../button/button.component';

@Component({
    selector: 'app-end-match-confirm',
    standalone: true,
    imports: [CommonModule, ModalComponent, ButtonComponent],
    templateUrl: './end-match-confirm.component.html',
    styleUrls: ['./end-match-confirm.component.scss']
})
export class EndMatchConfirmComponent {
    private matchService = inject(MatchService);
    private uiFeedback = inject(UIFeedbackService);

    @Input() matchId: string = '';
    @Input() visible = false;

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() matchEnded = new EventEmitter<Match>();

    isSubmitting = false;

    confirm(): void {
        if (!this.matchId || this.isSubmitting) return;

        this.isSubmitting = true;
        this.matchService.endMatch(this.matchId).subscribe({
            next: (endedMatch) => {
                // Auto submit report
                this.matchService.submitMatchReport(
                    this.matchId,
                    'تم إنهاء المباراة تلقائياً.',
                    endedMatch?.refereeId || '',
                    endedMatch?.refereeName || ''
                ).subscribe({
                    next: (matchWithReport) => {
                        this.uiFeedback.success('تم بنجاح', 'تم إنهاء المباراة وتقديم التقرير بنجاح');
                        this.isSubmitting = false;
                        this.matchEnded.emit(matchWithReport || endedMatch || undefined);
                        this.close();
                    },
                    error: () => {
                        this.uiFeedback.warning('تنبيه', 'تم إنهاء المباراة ولكن فشل تقديم التقرير التلقائي');
                        this.isSubmitting = false;
                        this.matchEnded.emit(endedMatch || undefined);
                        this.close();
                    }
                });
            },
            error: () => {
                this.uiFeedback.error('خطأ', 'فشل في إنهاء المباراة');
                this.isSubmitting = false;
            }
        });
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
