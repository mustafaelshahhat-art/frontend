import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UIFeedbackService } from '../../services/ui-feedback.service';

@Component({
    selector: 'app-global-loading',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './global-loading.component.html',
    styleUrls: ['./global-loading.component.scss']
})
export class GlobalLoadingComponent {
    uiFeedback = inject(UIFeedbackService);
}
