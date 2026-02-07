import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-pending-status-card',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './pending-status-card.component.html',
    styleUrls: ['./pending-status-card.component.scss']
})
export class PendingStatusCardComponent {
    @Input() title = 'حسابك قيد المراجعة';
    @Input() message = 'عذراً، لا يمكنك المتابعة حتى يتم اعتماد حسابك من قبل إدارة البطولة.';
    @Input() subMessage = 'يرجى الانتظار، سيتم إخطارك فور التفعيل.';
    @Input() icon = 'hourglass_top';
    @Input() showRefreshButton = true;
    @Input() refreshButtonText = 'تحديث الحالة';

    @Output() onRefresh = new EventEmitter<void>();

    refresh(): void {
        this.onRefresh.emit();
    }
}
