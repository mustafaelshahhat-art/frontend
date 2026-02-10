import { IconComponent } from '../icon/icon.component';
import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { timer } from 'rxjs';

@Component({
    selector: 'app-alert',
    standalone: true,
    imports: [IconComponent, CommonModule],
    templateUrl: './alert.component.html',
    styleUrls: ['./alert.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AlertComponent implements OnInit {
    @Input() type: 'success' | 'danger' | 'warning' | 'info' = 'info';
    @Input() title?: string;
    @Input() icon?: string;
    @Input() dismissible = false;
    @Input() autoDismiss = 0; // Duration in ms, 0 means no auto-dismiss

    visible = true;
    @Output() dismissed = new EventEmitter<void>();

    ngOnInit() {
        if (this.autoDismiss > 0) {
            timer(this.autoDismiss).subscribe(() => {
                this.dismiss();
            });
        }
    }

    dismiss() {
        this.visible = false;
        this.dismissed.emit();
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
