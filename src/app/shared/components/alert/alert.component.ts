import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-alert',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './alert.component.html',
    styleUrls: ['./alert.component.scss']
})
export class AlertComponent {
    @Input() type: 'success' | 'danger' | 'warning' | 'info' = 'info';
    @Input() title?: string;
    @Input() icon?: string;
    @Input() dismissible = false;

    visible = true;
    @Output() onClose = new EventEmitter<void>();

    dismiss() {
        this.visible = false;
        this.onClose.emit();
    }

    getDefaultIcon(): string {
        switch (this.type) {
            case 'success': return 'check_circle';
            case 'danger': return 'error';
            case 'warning': return 'warning';
            case 'info': return 'info';
            default: return 'info';
        }
    }
}
