import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UIFeedbackService } from '../../services/ui-feedback.service';

@Component({
    selector: 'app-global-alerts',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './global-alerts.component.html',
    styleUrls: ['./global-alerts.component.scss']
})
export class GlobalAlertsComponent {
    uiFeedback = inject(UIFeedbackService);

    getIcon(type: string): string {
        const icons: Record<string, string> = {
            success: 'check_circle',
            error: 'error',
            warning: 'warning',
            info: 'info'
        };
        return icons[type] || 'info';
    }
}
