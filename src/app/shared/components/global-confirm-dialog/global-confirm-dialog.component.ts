import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UIFeedbackService } from '../../services/ui-feedback.service';
import { ButtonComponent } from '../button/button.component';

@Component({
    selector: 'app-global-confirm-dialog',
    standalone: true,
    imports: [CommonModule, ButtonComponent],
    templateUrl: './global-confirm-dialog.component.html',
    styleUrls: ['./global-confirm-dialog.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class GlobalConfirmDialogComponent {
    uiFeedback = inject(UIFeedbackService);

    getButtonClass(type?: string): string {
        const classes: Record<string, string> = {
            danger: 'btn-danger',
            warning: 'btn-warning',
            info: 'btn-primary'
        };
        return classes[type || 'danger'] || 'btn-danger';
    }

    onConfirm(): void {
        this.uiFeedback.resolveConfirm(true);
    }

    onCancel(): void {
        this.uiFeedback.resolveConfirm(false);
    }
}
