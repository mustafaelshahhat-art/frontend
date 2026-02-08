import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-alert',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './alert.component.html',
    styleUrls: ['./alert.component.scss']
})
export class AlertComponent implements OnInit {
    @Input() type: 'success' | 'danger' | 'warning' | 'info' = 'info';
    @Input() title?: string;
    @Input() icon?: string;
    @Input() dismissible = false;
    @Input() autoDismiss = 0; // Duration in ms, 0 means no auto-dismiss

    visible = true;
    @Output() onClose = new EventEmitter<void>();

    ngOnInit() {
        if (this.autoDismiss > 0) {
            setTimeout(() => {
                this.dismiss();
            }, this.autoDismiss);
        }
    }

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
