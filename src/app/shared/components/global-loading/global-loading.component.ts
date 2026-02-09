import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UIFeedbackService } from '../../services/ui-feedback.service';

@Component({
    selector: 'app-global-loading',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './global-loading.component.html',
    styleUrls: ['./global-loading.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class GlobalLoadingComponent {
    uiFeedback = inject(UIFeedbackService);
}
