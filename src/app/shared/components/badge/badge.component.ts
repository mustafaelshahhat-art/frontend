import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-badge',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './badge.component.html',
    styleUrls: ['./badge.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BadgeComponent {
    @Input() type: 'primary' | 'gold' | 'danger' | 'info' | 'warning' | 'success' | 'muted' | 'neutral' | 'live' = 'primary';
    @Input() dot = false;
    @Input() dotType: 'active' | 'pending' | 'inactive' | 'error' | 'live' = 'active';
    @Input() pulse = false;
}
